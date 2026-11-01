// Renders the 1200x1200 App Store icon to icon-1200.png with no dependencies.
// Run: node docs/assets/make-icon.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const S = 1200;
const SS = 4; // supersamples per axis, for smooth edges

const hex = (h, a = 1) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
const GREEN = hex("#1a4d2e");
const WHITE = hex("#ffffff");
const FAINT = hex("#ffffff", 0.45);
const YELLOW = hex("#f1c40f");

const star = [];
for (let i = 0; i < 10; i++) {
  const r = i % 2 ? 26 : 60;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  star.push([600 + r * Math.cos(a), 800 + r * Math.sin(a)]);
}
const inPoly = (x, y, p) => {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const ring = (cx, cy, r, w) => (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - r) <= w / 2;
const disc = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) <= r;
const roundRect = (x0, y0, w, h, rad) => (x, y) => {
  const dx = Math.max(x0 + rad - x, 0, x - (x0 + w - rad));
  const dy = Math.max(y0 + rad - y, 0, y - (y0 + h - rad));
  return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h && Math.hypot(dx, dy) <= rad;
};

// Painted in order, same as the browser preview.
const layers = [
  [ring(300, 500, 115, 28), FAINT],
  [ring(900, 500, 115, 28), FAINT],
  [disc(600, 500, 160), YELLOW],
  [ring(600, 500, 192, 28), WHITE],
  [roundRect(390, 730, 420, 140, 44), WHITE],
  [(x, y) => inPoly(x, y, star), GREEN],
];

const raw = Buffer.alloc(S * (S * 3 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 3 + 1)] = 0; // PNG filter: none
  for (let x = 0; x < S; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        let c = GREEN.slice(0, 3);
        for (const [hit, col] of layers) {
          if (hit(px, py)) c = c.map((v, i) => v * (1 - col[3]) + col[i] * col[3]);
        }
        r += c[0]; g += c[1]; b += c[2];
      }
    }
    const o = y * (S * 3 + 1) + 1 + x * 3;
    const n = SS * SS;
    raw[o] = Math.round(r / n);
    raw[o + 1] = Math.round(g / n);
    raw[o + 2] = Math.round(b / n);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
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
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("./icon-1200.png", import.meta.url), png);
console.log(`icon-1200.png: ${png.length} bytes`);
