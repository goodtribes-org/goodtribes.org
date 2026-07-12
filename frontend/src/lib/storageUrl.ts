// Convert any stored image URL (http://localhost:9000/... or https://goodtribes.org/storage/...)
// to a /storage/{key} relative path that routes through the Next.js proxy in both dev and prod.
export function toProxyUrl(url: string): string {
  const knownBases = [
    process.env.NEXT_PUBLIC_STORAGE_URL,
    "http://localhost:9000/goodtribes-public",
    "https://goodtribes.org/storage",
  ].filter(Boolean) as string[];
  for (const base of knownBases) {
    if (url.startsWith(base + "/")) {
      return `/storage/${url.slice(base.length + 1)}`;
    }
  }
  return url;
}
