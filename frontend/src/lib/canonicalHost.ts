// One address for the site (#308). A login only holds on the host it was made
// on, so www.goodtribes.org and goodtribes.org used to look like two sites:
// logged in on one, logged out on the other. goodtribes.org is the canonical
// host (APP_URL, og:url, storage); an alias host goes there for every path —
// /api too, so the evening's QR link (/api/e/<code>) and the login callback
// follow. Used by middleware.ts.
export const CANONICAL_HOST = "goodtribes.org";
const ALIAS_HOSTS = new Set(["www.goodtribes.org"]);

// The URL to send this request to, or null to serve it where it is.
export function canonicalRedirect(hostHeader: string | null, pathname: string, search: string): string | null {
  const host = (hostHeader ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
  if (!ALIAS_HOSTS.has(host)) return null;
  return `https://${CANONICAL_HOST}${pathname}${search}`;
}
