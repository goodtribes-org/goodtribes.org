// Maps common free-text country spellings (as entered in User.country) to the
// exact "name" property used in the world-atlas TopoJSON (public/geo/countries-110m.json),
// so counts can be matched to map geographies. Unmatched countries are simply
// excluded from the map — country-level plotting is a best-effort visual, not
// a precise geocoding feature.
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  sweden: "Sweden",
  sverige: "Sweden",
  norway: "Norway",
  norge: "Norway",
  denmark: "Denmark",
  danmark: "Denmark",
  finland: "Finland",
  germany: "Germany",
  france: "France",
  spain: "Spain",
  italy: "Italy",
  netherlands: "Netherlands",
  ireland: "Ireland",
  portugal: "Portugal",
  austria: "Austria",
  belgium: "Belgium",
  poland: "Poland",
  "united kingdom": "United Kingdom",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  "united states": "United States of America",
  "united states of america": "United States of America",
  usa: "United States of America",
  us: "United States of America",
  canada: "Canada",
  switzerland: "Switzerland",
  kenya: "Kenya",
  nigeria: "Nigeria",
  "south africa": "South Africa",
  india: "India",
  brazil: "Brazil",
  mexico: "Mexico",
  australia: "Australia",
  japan: "Japan",
  china: "China",
};

/** Best-effort mapping from a free-text country string to a world-atlas geography name. */
export function normalizeCountryName(country?: string | null): string | null {
  if (!country) return null;
  return COUNTRY_NAME_ALIASES[country.trim().toLowerCase()] ?? null;
}

/** Groups a list of free-text country strings into normalized-name → count. */
export function countByCountry(countries: (string | null | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const raw of countries) {
    const name = normalizeCountryName(raw);
    if (!name) continue;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}
