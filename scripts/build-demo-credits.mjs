// Renders public/demo/CREDITS.md from public/demo/moto/manifest.json, the
// record fetch-moto-demo-assets.mjs keeps of where each image came from.
//
// Reading the manifest rather than a list kept in this file is the point:
// an earlier version had its own hardcoded list, which drifted from the
// files on disk and dropped attribution lines that CC BY and CC BY-SA
// require.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "public/demo/moto";
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, "utf8"));
const onDisk = readdirSync(DIR).filter((f) => f.endsWith(".jpg"));

const lines = [
  "# Demo image credits",
  "",
  "Photos used by the demo creator page (scripts/seed-storefront-demo.mjs).",
  "All are from Wikimedia Commons except where noted.",
  "",
];

// Product covers are built from the photos below by build-moto-covers.mjs
// and carry the licence of the photo they use.
const covers = onDisk.filter((f) => f.startsWith("cover-"));

for (const file of onDisk.filter((f) => !covers.includes(f)).sort()) {
  const m = manifest[file];
  if (!m) {
    console.log(`WARNING: no source recorded for moto/${file}`);
    continue;
  }
  lines.push(`- **moto/${file}**: ${m.title}`);
  lines.push(`  - License: ${m.license}`);
  lines.push(`  - Author: ${m.author}`);
  if (m.url) lines.push(`  - Source: ${m.url}`);
  if (m.note) lines.push(`  - Changes: ${m.note}`);
  console.log(`${file.padEnd(12)} ${m.license}`);
}

lines.push(
  "",
  `Product covers (${covers.map((f) => `moto/${f}`).join(", ")}) are built by`,
  "scripts/build-moto-covers.mjs from presets.jpg, luts.jpg and call.jpg above,",
  "and are shared under the same licence as the photo each one uses.",
  "",
  "Brand link thumbnails are not stored here. They load from each brand's own",
  "published preview image or icon, the way any link preview does.",
  "",
);

writeFileSync("public/demo/CREDITS.md", lines.join("\n"));
console.log("\nCREDITS.md rebuilt");
