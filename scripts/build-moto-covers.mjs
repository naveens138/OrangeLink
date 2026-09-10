// Builds product covers for the demo creator's shop from the licensed
// photos in public/demo/moto, each one showing what the buyer actually gets:
//
//   - presets and LUTs are sold by their look, so their packs show a
//     before/after split: the same frame flat on the left and graded on the
//     right, with the divider handle people know from editing apps
//   - the call is sold by time, so its card shows open slots, not a photo
//
// Covers inherit the licence of the photo they are built from; CREDITS.md
// lists the source photos (scripts/build-demo-credits.mjs).
import sharp from "sharp";

const DIR = "public/demo/moto";
const SIZE = 1000;

// Front face of the pack, in canvas pixels. Kept inside the middle 60% so
// the 3:5 tiles on the "See Full Shop" card, which crop the sides, still
// show the whole pack.
const FACE = { x: 295, y: 125, w: 500, h: 750 };
const SPINE = 60;

// The "before": flat, low-contrast and desaturated, like ungraded footage.
const flat = (img) => img.modulate({ saturation: 0.35, brightness: 1.04 }).linear(0.7, 40);

const COVERS = [
  {
    out: "cover-presets.jpg",
    kind: "split",
    photo: "presets.jpg",
    // Warm film look: reds up, blues down, more contrast.
    grade: (img) =>
      img
        .recomb([
          [1.14, 0.04, 0],
          [0.02, 1.0, 0],
          [0, 0.02, 0.84],
        ])
        .linear(1.14, -16)
        .modulate({ saturation: 1.15 }),
    tag: "LR",
    labels: ["BEFORE", "AFTER"],
    spine: "JANE  ·  LR PRESET PACK  ·  MK1-MK6",
    lines: ["LR PRESET PACK", "MK1-MK6"],
    sub: "6 presets · desktop and mobile",
  },
  {
    out: "cover-luts.jpg",
    kind: "split",
    photo: "luts.jpg",
    // Cooler, punchier cinema look.
    grade: (img) =>
      img
        .recomb([
          [0.96, 0.06, 0],
          [0, 1.0, 0.05],
          [0, 0.08, 1.12],
        ])
        .linear(1.1, -10)
        .modulate({ saturation: 1.1 }),
    tag: "LUT",
    labels: ["LOG", "GRADED"],
    spine: "JANE  ·  CINEMATIC RIDING LUTS",
    lines: ["CINEMATIC", "RIDING LUTS"],
    sub: "12 .cube files · Premiere, Resolve, FCP",
  },
  {
    out: "cover-call.jpg",
    kind: "call",
  },
];

const FONT = `font-family="Segoe UI, Helvetica, Arial, sans-serif"`;

function ground(box) {
  const { x, y, w, h } = FACE;
  return `
    <defs>
      <radialGradient id="g" cx="50%" cy="42%" r="75%">
        <stop offset="0" stop-color="#f7f5f2"/><stop offset="1" stop-color="#e6e2dc"/>
      </radialGradient>
      <filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
    <ellipse cx="${x + w / 2 + 40}" cy="${y + h + 8}" rx="${w / 2 + 40}" ry="26" fill="#000" opacity="0.28" filter="url(#b)"/>
    <rect x="${x + 24}" y="${y + 30}" width="${w}" height="${h}" rx="${box ? 4 : 32}" fill="#000" opacity="0.22" filter="url(#b)"/>`;
}

function spine(cover) {
  const { x, y, h } = FACE;
  return `
    <polygon points="${x - SPINE},${y + 30} ${x},${y} ${x},${y + h} ${x - SPINE},${y + h - 26}" fill="#1f2428"/>
    <text transform="translate(${x - SPINE / 2 + 6},${y + h / 2}) rotate(-90)" text-anchor="middle"
      ${FONT} font-size="17" font-weight="600" letter-spacing="3" fill="#c9cfd4">${cover.spine}</text>`;
}

function pill(x, y, text, { dark = false, anchor = "start" } = {}) {
  const w = 22 + text.length * 10.5;
  const left = anchor === "end" ? x - w : x;
  return `
    <rect x="${left}" y="${y}" width="${w}" height="30" rx="15" fill="${dark ? "#141413" : "#fff"}" fill-opacity="${dark ? 0.7 : 1}"/>
    <text x="${left + w / 2}" y="${y + 20}" text-anchor="middle" ${FONT} font-size="13" font-weight="700"
      letter-spacing="1.5" fill="${dark ? "#fff" : "#141413"}">${text}</text>`;
}

// Text and the before/after divider over a split photo.
function splitOverlay(cover) {
  const { w, h } = FACE;
  const pad = 30;
  const mid = w / 2;
  const handleY = h * 0.42;
  const [l1, l2] = cover.lines;
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.4" stop-color="#0b0d0f" stop-opacity="0"/>
          <stop offset="1" stop-color="#0b0d0f" stop-opacity="0.92"/>
        </linearGradient>
        <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b0d0f" stop-opacity="0.5"/>
          <stop offset="0.2" stop-color="#0b0d0f" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#s)"/>
      <rect width="${w}" height="${h}" fill="url(#t)"/>
      <line x1="${mid}" y1="0" x2="${mid}" y2="${h - 170}" stroke="#fff" stroke-width="3" stroke-opacity="0.95"/>
      <circle cx="${mid}" cy="${handleY}" r="24" fill="#fff"/>
      <path d="M${mid - 6} ${handleY - 8} l-8 8 l8 8 M${mid + 6} ${handleY - 8} l8 8 l-8 8"
        stroke="#141413" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${pill(mid - 16, handleY + 40, cover.labels[0], { dark: true, anchor: "end" })}
      ${pill(mid + 16, handleY + 40, cover.labels[1], { dark: true })}
      <text x="${pad}" y="${pad + 22}" ${FONT} font-size="20" font-weight="700" letter-spacing="6" fill="#fff">JANE</text>
      ${pill(w - pad, pad, cover.tag, { anchor: "end" })}
      <text x="${pad}" y="${h - 118}" ${FONT} font-size="40" font-weight="800" fill="#fff">${l1}</text>
      <text x="${pad}" y="${h - 72}" ${FONT} font-size="40" font-weight="800" fill="#ff6a3d">${l2}</text>
      <text x="${pad}" y="${h - 34}" ${FONT} font-size="17" font-weight="500" fill="#d5d9dc">${cover.sub}</text>
    </svg>`);
}

async function splitFace(cover) {
  const { w, h } = FACE;
  const base = await sharp(`${DIR}/${cover.photo}`).resize(w, h, { fit: "cover" }).png().toBuffer();
  const before = await flat(sharp(base))
    .extract({ left: 0, top: 0, width: w / 2, height: h })
    .png()
    .toBuffer();
  const after = await cover.grade(sharp(base)).png().toBuffer();
  return sharp(after)
    .composite([{ input: before, left: 0, top: 0 }, { input: splitOverlay(cover) }])
    .png()
    .toBuffer();
}

// The call: a dark card with the duration and a few open slots, one picked.
function callFace() {
  const { w, h } = FACE;
  const pad = 36;
  const slots = [
    ["TUE", "10:00", false],
    ["WED", "14:30", true],
    ["FRI", "18:00", false],
  ];
  const slotW = (w - pad * 2 - 24) / 3;
  const slotY = h - 250;
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="80%" cy="10%" r="80%">
          <stop offset="0" stop-color="#ff4812" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#ff4812" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" rx="32" fill="#141413"/>
      <rect width="${w}" height="${h}" rx="32" fill="url(#glow)"/>
      <text x="${pad}" y="${pad + 24}" ${FONT} font-size="20" font-weight="700" letter-spacing="6" fill="#fff">JANE</text>
      ${pill(w - pad, pad, "VIDEO CALL", { anchor: "end" })}
      <text x="${pad - 6}" y="330" ${FONT} font-size="190" font-weight="800" letter-spacing="-6" fill="#fff">1:1</text>
      <text x="${pad}" y="390" ${FONT} font-size="36" font-weight="800" fill="#fff">MOTO FILMMAKING</text>
      <text x="${pad}" y="432" ${FONT} font-size="36" font-weight="800" fill="#ff6a3d">CALL</text>
      <text x="${pad}" y="${slotY - 22}" ${FONT} font-size="15" font-weight="700" letter-spacing="2" fill="#8f8c86">PICK A TIME</text>
      ${slots
        .map(([day, time, picked], i) => {
          const x = pad + i * (slotW + 12);
          return `
            <rect x="${x}" y="${slotY}" width="${slotW}" height="96" rx="20"
              fill="${picked ? "#ff4812" : "#26241f"}" stroke="${picked ? "none" : "#3a3833"}"/>
            <text x="${x + slotW / 2}" y="${slotY + 38}" text-anchor="middle" ${FONT} font-size="15" font-weight="700"
              letter-spacing="2" fill="${picked ? "#fff" : "#8f8c86"}">${day}</text>
            <text x="${x + slotW / 2}" y="${slotY + 72}" text-anchor="middle" ${FONT} font-size="26" font-weight="700"
              fill="#fff">${time}</text>`;
        })
        .join("")}
      <text x="${pad}" y="${h - 48}" ${FONT} font-size="18" font-weight="500" fill="#bdb9b2">30 minutes · mounts, settings, the edit</text>
    </svg>`);
}

for (const cover of COVERS) {
  const { x, y } = FACE;
  const box = cover.kind === "split";
  const front = box ? await splitFace(cover) : await sharp(callFace()).png().toBuffer();
  const svg = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">${ground(box)}${box ? spine(cover) : ""}</svg>`,
  );

  // Composite first, resize in a second pass: sharp resizes before it
  // composites within a single pipeline.
  const full = await sharp(svg)
    .composite([{ input: front, left: x, top: y }])
    .png()
    .toBuffer();
  await sharp(full).resize(900, 900).jpeg({ quality: 86 }).toFile(`${DIR}/${cover.out}`);
  console.log(cover.out);
}
