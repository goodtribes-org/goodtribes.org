const COUNTRY_CURRENCY: Record<string, string> = {
  sweden: "SEK",
  sverige: "SEK",
  norway: "NOK",
  norge: "NOK",
  denmark: "DKK",
  danmark: "DKK",
  finland: "EUR",
  germany: "EUR",
  france: "EUR",
  spain: "EUR",
  italy: "EUR",
  netherlands: "EUR",
  ireland: "EUR",
  portugal: "EUR",
  austria: "EUR",
  belgium: "EUR",
  "united kingdom": "GBP",
  uk: "GBP",
  "great britain": "GBP",
  england: "GBP",
  "united states": "USD",
  usa: "USD",
  us: "USD",
  "united states of america": "USD",
  canada: "CAD",
  switzerland: "CHF",
};

const SUPPORTED_CURRENCIES = ["SEK", "EUR", "USD", "NOK", "DKK", "GBP", "CAD", "CHF"];

/** Best-effort currency suggestion from a free-text country field. Falls back to SEK. */
export function suggestCurrencyForCountry(country?: string | null): string {
  if (!country) return "SEK";
  const match = COUNTRY_CURRENCY[country.trim().toLowerCase()];
  return match ?? "SEK";
}

/** Locale-aware currency formatting — shared by all funding UI to avoid drift. */
export function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const RATE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — avoids a live API call per render
const rateCache = new Map<string, { rate: number; fetchedAt: number }>();

/**
 * Secondary reference currency for a campaign's native currency, used only for the
 * "≈ $X" hint next to the real amount — never for actual charges (Stripe always
 * uses the campaign's native currency as the source of truth).
 */
export function secondaryCurrencyFor(nativeCurrency: string): string {
  return nativeCurrency === "USD" ? "EUR" : "USD";
}

async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, {
      next: { revalidate: 43200 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    return data.rates?.[to] ?? null;
  } catch {
    return null;
  }
}

/** Cached exchange rate lookup (12h TTL) — never blocks or fails the primary amount display. */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  if (!SUPPORTED_CURRENCIES.includes(from) || !SUPPORTED_CURRENCIES.includes(to)) return null;

  const key = `${from}_${to}`;
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < RATE_CACHE_TTL_MS) {
    return cached.rate;
  }

  const rate = await fetchExchangeRate(from, to);
  if (rate !== null) rateCache.set(key, { rate, fetchedAt: Date.now() });
  return rate ?? cached?.rate ?? null;
}

/** Formats a secondary "≈ $X" conversion hint, or null if the rate isn't available. */
export async function formatSecondaryConversion(
  amount: number,
  fromCurrency: string,
  locale: string,
): Promise<string | null> {
  const toCurrency = secondaryCurrencyFor(fromCurrency);
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  if (rate === null) return null;
  return formatCurrency(Math.round(amount * rate), toCurrency, locale);
}
