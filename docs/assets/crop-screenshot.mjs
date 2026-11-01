// Crops a PNG screenshot and scales it to 1600x900 for the App Store listing.
// Usage: node docs/assets/crop-screenshot.mjs <in.png> <out.png> <x> <y> <width> <height> [maskX,maskY,maskW,maskH ...]
// Each optional mask (in source pixels) is painted white first, e.g. to hide prices,
// which App Store images must not show.
// No dependencies: decodes and encodes PNG with node:zlib.
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const [, , input, output, ...rest] = process.argv;
const [cx, cy, cw, ch] = rest.slice(0, 4).map(Number);
const masks = rest.slice(4).map((m) => m.split(",").map(Number));
const OUT_W = 1600;
const OUT_H = 900;

function decodePng(buf) {
  let pos = 8;
  let width, height, bitDepth, colorType, interlace;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG: depth ${bitDepth}, color ${colorType}, interlace ${interlace}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = v & 0xff;
    }
  }
  return { width, height, bpp, px };
}

function encodePng(width, height, rgb) {
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const img = decodePng(readFileSync(input));
for (const [mx, my, mw, mh] of masks) {
  for (let y = my; y < my + mh; y++) {
    for (let x = mx; x < mx + mw; x++) {
      const i = (y * img.width + x) * img.bpp;
      img.px[i] = img.px[i + 1] = img.px[i + 2] = 255;
    }
  }
}
const out = Buffer.alloc(OUT_W * OUT_H * 3);
// Box filter: average every source pixel that falls under each output pixel.
const sx = cw / OUT_W;
const sy = ch / OUT_H;
for (let y = 0; y < OUT_H; y++) {
  const y0 = cy + y * sy, y1 = y0 + sy;
  for (let x = 0; x < OUT_W; x++) {
    const x0 = cx + x * sx, x1 = x0 + sx;
    let r = 0, g = 0, b = 0, wsum = 0;
    for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) {
      const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
      for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
        const wx = Math.min(xx + 1, x1) - Math.max(xx, x0);
        const w = wx * wy;
        const i = (Math.min(yy, img.height - 1) * img.width + Math.min(xx, img.width - 1)) * img.bpp;
        r += img.px[i] * w; g += img.px[i + 1] * w; b += img.px[i + 2] * w; wsum += w;
      }
    }
    const o = (y * OUT_W + x) * 3;
    out[o] = Math.round(r / wsum);
    out[o + 1] = Math.round(g / wsum);
    out[o + 2] = Math.round(b / wsum);
  }
}
writeFileSync(output, encodePng(OUT_W, OUT_H, out));
console.log(`${output}: ${OUT_W}x${OUT_H}`);
