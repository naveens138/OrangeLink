import dns from "node:dns/promises";
import net from "node:net";

/**
 * URL validation for the import scraper.
 *
 * This is a Server-Side Request Forgery surface: whatever URL someone pastes,
 * our server requests with our network position. Without guards, a paste of
 * http://169.254.169.254/latest/meta-data/ would hand back cloud instance
 * credentials, and http://localhost:54322 would reach services never meant to
 * be public. So the host is resolved and checked against private address
 * space before any request is made.
 *
 * Residual risk, stated honestly: between the DNS check and the connection, a
 * hostile DNS server could re-answer with a private address (DNS rebinding).
 * Closing that needs the socket pinned to the validated IP, which means a
 * custom undici dispatcher. The current guard blocks the realistic cases
 * (direct private literals, redirect chains into the internal network,
 * metadata endpoints); if this ever fetches on a schedule or from untrusted
 * bulk input, pin the socket.
 *
 * No `server-only` marker here so the logic stays unit-testable; it imports
 * node:dns and node:net, which cannot be bundled into a client component
 * anyway. The module that actually performs fetches carries the marker.
 */

export class UnsafeUrlError extends Error {}

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  return (
    a === 0 || // "this network"
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && b >= 18 && b <= 19) || // benchmarking
    a >= 224 // multicast + reserved
  );
}

/**
 * Expands any IPv6 spelling to its eight 16-bit groups.
 *
 * Needed because string matching on the address is not safe: `new URL()`
 * rewrites `::ffff:10.0.0.1` to `::ffff:a00:1`, so a regex looking for a
 * dotted quad silently misses a loopback-equivalent address. Comparing
 * numbers instead makes every spelling of the same address behave alike.
 */
function ipv6Groups(raw: string): number[] | null {
  let addr = raw.toLowerCase().split("%")[0];

  // A trailing dotted quad (::ffff:10.0.0.1) becomes two hex groups.
  const dotted = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const p = dotted[1].split(".").map(Number);
    if (p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
    const hex = `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
    addr = addr.slice(0, dotted.index) + hex;
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  }

  const nums = groups.map((g) => parseInt(g || "0", 16));
  return nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff) ? null : nums;
}

function embeddedIPv4(g: number[]): string {
  return `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
}

export function isPrivateIPv6(ip: string): boolean {
  const g = ipv6Groups(ip);
  if (!g) return true; // unparseable — refuse rather than guess

  // :: (unspecified) and ::1 (loopback)
  if (g.slice(0, 7).every((n) => n === 0) && (g[7] === 0 || g[7] === 1)) {
    return true;
  }

  // ::ffff:0:0/96 IPv4-mapped, ::/96 IPv4-compatible, and 64:ff9b::/96 NAT64
  // all carry an IPv4 address in the low 32 bits — judge them by that.
  const isMapped = g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff;
  const isCompat = g.slice(0, 6).every((n) => n === 0);
  const isNat64 = g[0] === 0x0064 && g[1] === 0xff9b;
  if (isMapped || isCompat || isNat64) return isPrivateIPv4(embeddedIPv4(g));

  const first = g[0];
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not a parseable IP — refuse rather than guess
}

/** Throws UnsafeUrlError unless the URL is public http(s) resolving to a public address. */
export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    // Blocks file:, data:, gopher:, ftp: and friends.
    throw new UnsafeUrlError("Only http:// and https:// links can be imported.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  // An IP literal never needs DNS, and must be checked directly.
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new UnsafeUrlError("That address is not publicly reachable.");
    }
    return url;
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    throw new UnsafeUrlError("That address is not publicly reachable.");
  }

  let resolved;
  try {
    resolved = await dns.lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError("We couldn't find that domain.");
  }

  // Every address the name resolves to must be public — one private answer is
  // enough for the connection to land somewhere internal.
  if (resolved.length === 0 || resolved.some((r) => isPrivateAddress(r.address))) {
    throw new UnsafeUrlError("That address is not publicly reachable.");
  }

  return url;
}
