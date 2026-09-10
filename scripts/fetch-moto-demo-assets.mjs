// Fetches freely-licensed motorcycle photography from Wikimedia Commons for
// the demo creator page (a made-up moto creator, laid out like
// linktr.ee/mojobike without using that creator's identity or images).
//
// Every saved file is recorded in public/demo/moto/manifest.json with its
// Commons title, licence and author, and CREDITS.md is rendered from that
// manifest by scripts/build-demo-credits.mjs. Keeping the record next to the
// files is what stops attribution going missing when this is re-run — the
// earlier fetch script rewrote its credits with only that run's files.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "public/demo/moto";
const MANIFEST = `${OUT}/manifest.json`;
mkdirSync(OUT, { recursive: true });

const UA = "OrangeLink-demo-seed/1.0 (contact: naveensyadav1707@gmail.com)";
const API = "https://commons.wikimedia.org/w/api.php";

async function api(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ format: "json", ...params })}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`commons ${res.status}`);
  return res.json();
}

// file -> search terms, the subject its title must mention, and whether a
// person may be recognisable (never, for the avatar — a helmet is the point).
const WANTED = {
  "avatar.jpg": {
    terms: ["motorcyclist helmet riding", "motorcycle rider helmet", "biker full face helmet"],
    subject: /motorcycl|motorbike|biker|rider/i,
    width: 600,
  },
  "presets.jpg": {
    terms: ["motorcycle mountain road", "motorcycle scenic road", "motorcycle landscape"],
    subject: /motorcycl|motorbike/i,
    width: 900,
  },
  "luts.jpg": {
    terms: ["motorcycle sunset", "motorcycle golden hour", "motorcycle dusk road"],
    subject: /motorcycl|motorbike/i,
    width: 900,
  },
  "call.jpg": {
    terms: ["motorcycle helmet close up", "motorcycle helmet", "motorbike helmet"],
    subject: /helmet/i,
    width: 900,
  },
  "gloves.jpg": {
    terms: ["motorcycle gloves", "motorcycle glove", "leather riding gloves"],
    subject: /glove/i,
    width: 400,
  },
  "jacket.jpg": {
    terms: ["motorcycle jacket", "leather motorcycle jacket", "riding jacket"],
    subject: /jacket/i,
    width: 400,
  },
  "boots.jpg": {
    terms: ["motorcycle boots", "motorcycle boot", "riding boots"],
    subject: /boot/i,
    width: 400,
  },
};

function score({ title, license }) {
  let s = 0;
  if (/^cc0|public domain/i.test(license)) s += 6;
  else if (/^cc by \d/i.test(license)) s += 3;
  else if (/^cc by-sa/i.test(license)) s += 1;
  // Crowds, races and logos make poor thumbnails.
  if (/race|racing|grand prix|motogp|crowd|logo|poster|map|diagram|museum/i.test(title)) s -= 6;
  return s;
}

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

for (const [file, spec] of Object.entries(WANTED)) {
  const candidates = [];
  for (const term of spec.terms) {
    try {
      const s = await api({
        action: "query",
        list: "search",
        srsearch: `${term} filetype:bitmap`,
        srnamespace: "6",
        srlimit: "15",
      });
      const titles = (s.query?.search ?? []).map((r) => r.title).filter((t) => spec.subject.test(t));
      if (!titles.length) continue;
      const info = await api({
        action: "query",
        titles: titles.join("|"),
        prop: "imageinfo",
        iiprop: "url|extmetadata|mime|size",
        iiurlwidth: String(spec.width),
      });
      for (const page of Object.values(info.query?.pages ?? {})) {
        const ii = page.imageinfo?.[0];
        if (!ii?.thumburl || !/^image\/jpeg$/.test(ii.mime ?? "")) continue;
        if ((ii.width ?? 0) < 700) continue; // too small to crop well
        const m = ii.extmetadata ?? {};
        candidates.push({
          title: page.title,
          thumb: ii.thumburl,
          license: m.LicenseShortName?.value ?? "unknown",
          author: (m.Artist?.value ?? "unknown").replace(/<[^>]*>/g, "").trim(),
          url: ii.descriptionurl,
        });
      }
    } catch {
      /* try the next term */
    }
  }

  // Drop anything whose licence we could not establish.
  const usable = candidates.filter((c) => c.license !== "unknown");
  usable.sort((a, b) => score(b) - score(a));
  const pick = usable[0];
  if (!pick) {
    console.log(`${file.padEnd(12)} NO USABLE IMAGE`);
    continue;
  }
  const buf = Buffer.from(await (await fetch(pick.thumb, { headers: { "User-Agent": UA } })).arrayBuffer());
  writeFileSync(`${OUT}/${file}`, buf);
  manifest[file] = { title: pick.title, license: pick.license, author: pick.author, url: pick.url };
  console.log(`${file.padEnd(12)} ${pick.license.padEnd(14)} ${pick.title}`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nmanifest: ${Object.keys(manifest).length} entries`);
