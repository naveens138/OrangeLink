// Generates every logo and icon size from the one source image in
// brand/logo-source.webp, so swapping the logo is: replace that file, run
// this script.
//
// A new logo gets a new filename (logo-orange.png replaced logo.png): the
// image optimizer and browsers cache by URL, so reusing the old name kept
// serving the old mark.
//
//   public/logo-orange.png   in-app logo (nav, sidebar, auth, storefront)
//   src/app/icon.png         browser tab icon, 192px (Next's app icon convention)
//   src/app/apple-icon.png   iOS home screen; on white, since iOS fills
//                            transparent areas with black
//   src/app/favicon.ico      16/32/48px for browsers that ask for /favicon.ico
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const SOURCE = "brand/logo-source.webp";

// Trim to the artwork, then centre it on a square canvas with a little air.
async function square(size, { pad = 0.04, background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const trimmed = await sharp(SOURCE).trim().png().toBuffer();
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, left: offset, top: offset }])
    .png()
    .toBuffer()
    // Quantised: the photographic orange is ~400KB as a full-colour PNG at
    // 512px, too heavy for an icon every page load fetches.
    .then((buf) => sharp(buf).png({ palette: true, quality: 85, effort: 10 }).toBuffer());
}

writeFileSync("public/logo-orange.png", await square(256));
writeFileSync("src/app/icon.png", await square(192));
writeFileSync(
  "src/app/apple-icon.png",
  await square(180, { pad: 0.12, background: { r: 255, g: 255, b: 255, alpha: 1 } }),
);

// An .ico is a small directory header followed by images; modern browsers
// accept PNG data inside it, so each entry is just a PNG.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => square(s, { pad: 0.02 })));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const at = 6 + i * 16;
  header.writeUInt8(s, at); // width
  header.writeUInt8(s, at + 1); // height
  header.writeUInt8(0, at + 2); // palette
  header.writeUInt8(0, at + 3); // reserved
  header.writeUInt16LE(1, at + 4); // colour planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...pngs]));

console.log("logo-orange.png, icon.png, apple-icon.png, favicon.ico written");
