// Utlysningar (#343): what every source adapter hands the import — the
// source's own words and dates for one call, nothing interpreted. Our
// fields (summary, applicant types, amounts, …) are filled later by the AI
// as a suggestion, or by an admin.
export type RawCall = {
  externalId: string;
  title: string;
  url: string | null;
  applyUrl: string | null;
  sourceDescription: string | null;
  eligibilityText: string | null;
  amountText: string | null;
  opensAt: Date | null;
  deadline: Date | null;
  totalBudgetSek: number | null;
};

// One field's source: a short quote and where it's from. Never the full text.
export type Provenance = Record<string, { quote: string; url: string | null }>;

export const QUOTE_MAX = 240;

export function shortQuote(text: string | null | undefined): string | null {
  const t = text?.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > QUOTE_MAX ? `${t.slice(0, QUOTE_MAX - 1)}…` : t;
}

const TZ = "Europe/Stockholm";

// Swedish funders give local times without an offset ("2026-11-05T14:00:00"
// = 14:00 Swedish time). Read them as Stockholm time whatever the server's
// zone is — a container runs in UTC and would shift every deadline.
export function stockholmTime(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(local);
  if (!m) return null;
  const [y, mo, d, h = "0", mi = "0", s = "0"] = m.slice(1);
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  // Stockholm's offset at that moment (+1 h or +2 h in summer).
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(asUtc))
      .map((p) => [p.type, p.value]),
  );
  const seen = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(asUtc - (seen - asUtc));
}

export function stockholmLabel(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}
