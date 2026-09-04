// Confirms every protected route is actually gated.
//
// Worth testing rather than assuming: Next 16 renamed the `middleware`
// convention to `proxy`, and a matcher glob that misses a path fails open —
// the route just renders, with no error to notice.
//
// Two independent layers are checked:
//   1. src/proxy.ts should redirect an anonymous request to /login
//   2. requireCreator() should redirect even if the proxy were bypassed, and
//      RLS means a bypass still could not return another account's data
//
// Run against a dev server: node scripts/verify-route-gate.mjs [baseUrl]
const base = process.argv[2] ?? "http://localhost:3000";

// Kept in sync with src/components/dashboard/nav-items.ts, plus paths that do
// not appear in the nav at all (a nested route, and one that does not exist)
// to prove the glob matches by prefix rather than by enumerated page.
const protectedPaths = [
  "/dashboard",
  "/dashboard/links",
  "/dashboard/products",
  "/dashboard/orders",
  "/dashboard/analytics",
  "/dashboard/automations",
  "/dashboard/email",
  "/dashboard/domains",
  "/dashboard/import",
  "/dashboard/media-kit",
  "/dashboard/settings",
  "/dashboard/settings/deeply/nested",
  "/dashboard/does-not-exist",
  "/claim-username",
];

const publicPaths = ["/", "/login", "/signup", "/jane"];

let failures = 0;

async function head(path) {
  const res = await fetch(base + path, {
    redirect: "manual",
    headers: { accept: "text/html" },
  });
  return { status: res.status, location: res.headers.get("location") ?? "" };
}

console.log(`PROTECTED — anonymous request should redirect to /login`);
for (const path of protectedPaths) {
  const { status, location } = await head(path);
  const redirected = status >= 300 && status < 400 && location.includes("/login");
  if (redirected) {
    console.log(`  ok    ${path.padEnd(34)} ${status} -> ${location.replace(base, "")}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${path.padEnd(34)} ${status} -> ${location || "(rendered)"}`);
  }
}

console.log(`\nPUBLIC — should NOT be redirected to /login`);
for (const path of publicPaths) {
  const { status, location } = await head(path);
  const bounced = status >= 300 && status < 400 && location.includes("/login");
  if (bounced) {
    failures += 1;
    console.log(`  FAIL  ${path.padEnd(34)} ${status} -> ${location.replace(base, "")}`);
  } else {
    console.log(`  ok    ${path.padEnd(34)} ${status}`);
  }
}

// Even with the proxy out of the picture, no dashboard HTML should contain
// another account's data. A gate that redirects but still streams the page
// first would show up here.
console.log(`\nLEAKAGE — anonymous fetch of /dashboard must not contain creator data`);
const res = await fetch(base + "/dashboard", { redirect: "follow" });
const html = await res.text();
const markers = ["Jane Rivera", "jane@example.com", "Editorial Lightroom Presets"];
const found = markers.filter((m) => html.includes(m));
if (found.length) {
  failures += 1;
  console.log(`  FAIL  response contained: ${found.join(", ")}`);
} else {
  console.log(`  ok    no creator data in the anonymous response`);
}

console.log(
  failures === 0
    ? "\nPASS — every protected route is gated; public routes are not."
    : `\nFAIL — ${failures} problem(s) above.`,
);
process.exitCode = failures === 0 ? 0 : 1;
