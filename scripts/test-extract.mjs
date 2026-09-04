// Exercises the extraction pipeline against synthetic pages shaped like the
// real tools, so the strategies can be checked without depending on live sites.
import { extractFromHtml, detectPlatform } from "../src/lib/import/platforms.ts";
import { extractGeneric } from "../src/lib/import/generic.ts";

const cases = [];

// --- Next.js hydration blob (Linktree-shaped) ------------------------------
cases.push({
  name: "embedded __NEXT_DATA__ (Linktree)",
  url: "https://linktr.ee/janerivera",
  expectStrategy: "embedded-json",
  expectPlatform: "linktree",
  html: `<html><head>
    <title>Jane Rivera | Linktree</title>
    <meta property="og:title" content="Jane Rivera | Linktree">
    <meta property="og:description" content="Photographer &amp; presets.">
  </head><body>
  <script id="__NEXT_DATA__" type="application/json">
  {"props":{"pageProps":{"account":{"username":"janerivera"},"links":[
    {"id":1,"title":"My YouTube channel","url":"https://youtube.com/@jane","position":0},
    {"id":2,"title":"Shop my presets","url":"https://gumroad.com/l/presets?utm_source=linktree","position":1},
    {"id":3,"title":"Old giveaway","url":"https://example.com/giveaway","position":2,"hidden":true},
    {"id":4,"title":"Instagram","url":"https://instagram.com/jane","position":3}
  ]}}}
  </script>
  <a href="/login">Log in</a><a href="https://linktr.ee/s/about">Create your own</a>
  </body></html>`,
});

// --- RSC streamed payload (App Router) --------------------------------------
const rscPayload = JSON.stringify({
  profile: { name: "Sam" },
  blocks: [
    { label: "Newsletter", href: "https://buttondown.email/sam", order: 0 },
    { label: "Portfolio", href: "https://sam.design", order: 1 },
    { label: "TikTok", href: "https://tiktok.com/@sam", order: 2 },
  ],
}).replace(/"/g, '\\"');
cases.push({
  name: "RSC __next_f streamed payload",
  url: "https://beacons.ai/sam",
  expectStrategy: "embedded-json",
  expectPlatform: "beacons",
  html: `<html><head><title>Sam</title></head><body>
    <script>self.__next_f.push([1,"${rscPayload}"])</script>
  </body></html>`,
});

// --- window.__NUXT__ assignment ---------------------------------------------
cases.push({
  name: "window.__NUXT__ assignment",
  url: "https://msha.ke/creator",
  expectStrategy: "embedded-json",
  expectPlatform: "milkshake",
  html: `<html><head><title>Creator</title></head><body>
  <script>window.__NUXT__ = {"data":[{"cards":[
    {"name":"Book a call","link":"https://cal.com/creator"},
    {"name":"My shop","link":"https://shop.example.com"}
  ]}]};</script></body></html>`,
});

// --- JSON-LD only ------------------------------------------------------------
cases.push({
  name: "JSON-LD sameAs",
  url: "https://someunknowntool.example/creator",
  expectStrategy: "json-ld",
  expectPlatform: "generic",
  html: `<html><head><title>Creator</title>
  <script type="application/ld+json">
  {"@type":"Person","name":"Creator","sameAs":[
    "https://instagram.com/creator","https://youtube.com/@creator","https://patreon.com/creator"]}
  </script></head><body></body></html>`,
});

// --- plain anchors (never-seen tool) ----------------------------------------
cases.push({
  name: "plain anchors on unknown tool",
  url: "https://brandnewtool.example/jane",
  expectStrategy: "dom",
  expectPlatform: "generic",
  html: `<html><head><title>Jane — brandnewtool</title></head><body>
    <a href="https://brandnewtool.example/login">Log in</a>
    <a href="https://brandnewtool.example/pricing">Pricing</a>
    <a href="https://podcast.example/show">Listen to my podcast</a>
    <a href="https://shop.example/merch">Buy merch</a>
    <a href="https://instagram.com/jane">Instagram</a>
    <a href="/privacy">Privacy Policy</a>
  </body></html>`,
});

// --- nothing usable ----------------------------------------------------------
cases.push({
  name: "empty SPA shell",
  url: "https://spa.example/user",
  expectStrategy: "none",
  expectPlatform: "generic",
  html: `<html><head><title>Loading…</title></head><body><div id="root"></div></body></html>`,
});

let failures = 0;

for (const c of cases) {
  const result = extractFromHtml(c.html, c.url);
  const strategyOk = result.strategy === c.expectStrategy;
  const platformOk = result.platform === c.expectPlatform;

  if (!strategyOk || !platformOk) failures += 1;

  console.log(
    `${strategyOk && platformOk ? "ok  " : "FAIL"} ${c.name}\n     platform=${result.platform} (want ${c.expectPlatform})  strategy=${result.strategy} (want ${c.expectStrategy})`,
  );
  for (const b of result.blocks) {
    const cfg = b.config;
    const desc =
      b.type === "social_icons"
        ? `[${cfg.platforms.join(", ")}]`
        : `"${cfg.label}" -> ${cfg.url}`;
    console.log(`       ${b.type.padEnd(13)} ${desc}${b.warnings ? `  ⚠ ${b.warnings.join("; ")}` : ""}`);
  }
  for (const w of result.warnings) console.log(`       ! ${w}`);
  console.log();
}

// --- targeted assertions -----------------------------------------------------
console.log("ASSERTIONS");
const linktree = extractFromHtml(cases[0].html, cases[0].url);
const linktreeLinks = linktree.blocks.filter((b) => b.type === "link");

function assert(label, cond) {
  if (!cond) failures += 1;
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}`);
}

assert("chrome links (login / create your own) excluded", linktreeLinks.length === 3);
assert(
  "tracking params stripped",
  linktreeLinks.some((b) => b.config.url === "https://gumroad.com/l/presets"),
);
assert(
  "socials folded into one social_icons block",
  linktree.blocks.filter((b) => b.type === "social_icons").length === 1,
);
assert(
  "hidden link kept but flagged",
  linktreeLinks.some((b) => b.warnings?.some((w) => w.includes("Hidden"))),
);
assert("link order preserved", linktreeLinks[0].config.label === "My YouTube channel");
assert("branding stripped from display name", linktree.profile.displayName === "Jane Rivera");
assert("platform detection by domain", detectPlatform("https://linktr.ee/x")?.id === "linktree");
assert("unknown domain -> no platform", detectPlatform("https://unknown.example/x") === null);

const dom = extractGeneric(cases[4].html, cases[4].url);
assert(
  "same-host chrome excluded from anchor pass",
  dom.blocks.filter((b) => b.type === "link").length === 2,
);

console.log(
  failures === 0 ? "\nPASS — all extraction cases behaved as expected." : `\nFAIL — ${failures} problem(s).`,
);
process.exitCode = failures === 0 ? 0 : 1;
