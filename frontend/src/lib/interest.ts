// "Jag vill att det här startar där jag bor" (#332). Pure helpers: places
// grouped case-insensitively, and when a project asks for interest at all.

export type InterestRow = { place: string; wantsToHelp: boolean };
export type PlaceInterest = { place: string; count: number; helpers: number };

// "  göteborg " → "Göteborg": trimmed, single spaces, first letter capital.
export function normalizePlace(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  return s ? s[0].toLocaleUpperCase("sv") + s.slice(1) : "";
}

// Most wanted first; ties alphabetically. The place is shown as first written.
export function groupByPlace(rows: InterestRow[]): PlaceInterest[] {
  const byKey = new Map<string, PlaceInterest>();
  for (const r of rows) {
    const place = normalizePlace(r.place);
    if (!place) continue;
    const key = place.toLocaleLowerCase("sv");
    const cur = byKey.get(key) ?? { place, count: 0, helpers: 0 };
    cur.count++;
    if (r.wantsToHelp) cur.helpers++;
    byKey.set(key, cur);
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.place.localeCompare(b.place, "sv"));
}

// Asked on published projects that are open for others to start their own,
// or that are growing (Skala).
export function asksForInterest(p: { publishedAt: Date | null; openForReplication: boolean; phase: string }): boolean {
  return !!p.publishedAt && (p.openForReplication || p.phase === "SCALE");
}
