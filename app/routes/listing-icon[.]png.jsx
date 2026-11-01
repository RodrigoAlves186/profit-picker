import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Serves the App Store icon with CORS so the listing tools can fetch it.
export const loader = async () => {
  const png = await readFile(join(process.cwd(), "public", "icon-1200.png"));
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
