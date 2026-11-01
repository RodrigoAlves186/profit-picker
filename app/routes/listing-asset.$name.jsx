import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Serves App Store listing images with CORS so they can be uploaded to the
// listing from the browser. Only the files below are exposed.
const FILES = [
  "icon-1200.png",
  "listing-1.png",
  "listing-2.png",
  "listing-3.png",
  "listing-feature.png",
];

export const loader = async ({ params }) => {
  if (!FILES.includes(params.name)) throw new Response("Not found", { status: 404 });
  const png = await readFile(join(process.cwd(), "public", params.name));
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
