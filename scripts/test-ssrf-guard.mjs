// Exercises the SSRF guard in src/lib/import/safe-fetch.ts.
// Run with: npx tsx scripts/test-ssrf-guard.mjs
import { assertSafeUrl, UnsafeUrlError } from "../src/lib/import/safe-url.ts";

const mustBlock = [
  ["cloud metadata (AWS/GCP/Azure)", "http://169.254.169.254/latest/meta-data/"],
  ["localhost by name", "http://localhost:3000/"],
  ["loopback literal", "http://127.0.0.1:5432/"],
  ["loopback alt form", "http://127.1/"],
  ["IPv6 loopback", "http://[::1]:8080/"],
  ["private 10/8", "http://10.0.0.5/"],
  ["private 192.168/16", "http://192.168.1.1/"],
  ["private 172.16/12", "http://172.20.0.1/"],
  ["CGNAT 100.64/10", "http://100.64.0.1/"],
  ["IPv4-mapped IPv6 (dotted)", "http://[::ffff:10.0.0.1]/"],
  ["IPv4-mapped IPv6 (hex form)", "http://[::ffff:a00:1]/"],
  ["IPv4-mapped loopback", "http://[::ffff:127.0.0.1]/"],
  ["IPv4-mapped metadata", "http://[::ffff:169.254.169.254]/"],
  ["IPv4-compatible IPv6", "http://[::10.0.0.1]/"],
  ["NAT64 to private", "http://[64:ff9b::a00:1]/"],
  ["IPv6 unique-local", "http://[fd00::1]/"],
  ["IPv6 link-local", "http://[fe80::1]/"],
  ["IPv6 multicast", "http://[ff02::1]/"],
  ["file scheme", "file:///etc/passwd"],
  ["data scheme", "data:text/html,<h1>x</h1>"],
  ["gopher scheme", "gopher://127.0.0.1:11211/"],
  [".internal TLD", "http://metadata.internal/"],
  ["DNS name resolving to loopback", "http://localtest.me/"],
  ["not a URL at all", "just some text"],
];

const mustAllow = [
  ["public https", "https://example.com/"],
  ["public linktree", "https://linktr.ee/someone"],
];

let failures = 0;

console.log("MUST BLOCK");
for (const [label, url] of mustBlock) {
  try {
    await assertSafeUrl(url);
    failures += 1;
    console.log(`  ALLOWED(!)  ${label.padEnd(34)} ${url}`);
  } catch (e) {
    const tag = e instanceof UnsafeUrlError ? "ok    " : "ok(?) ";
    console.log(`  ${tag}      ${label.padEnd(34)} ${e.message}`);
  }
}

console.log("\nMUST ALLOW");
for (const [label, url] of mustAllow) {
  try {
    await assertSafeUrl(url);
    console.log(`  ok          ${label.padEnd(34)} ${url}`);
  } catch (e) {
    failures += 1;
    console.log(`  BLOCKED(!)  ${label.padEnd(34)} ${e.message}`);
  }
}

console.log(
  failures === 0
    ? "\nPASS — private address space and non-http schemes are refused."
    : `\nFAIL — ${failures} case(s) wrong.`,
);
process.exitCode = failures === 0 ? 0 : 1;
