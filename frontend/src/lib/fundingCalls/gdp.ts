import { stockholmTime, type RawCall } from "./types";

// The funders' joint GDP API (Gemensamma dataprojektet: Vinnova, Formas,
// Forte, Vetenskapsrådet, Energimyndigheten). Spec:
// github.com/Gemensamma-data-projektet-GDP/Dokumentation. Each funder has
// its own base URL and needs an API key from gdphub.se, sent as the
// Authorization header. Without a key the source is skipped, not failed.
export const GDP_FUNDERS = {
  GDP_FORMAS: { base: "https://api.formas.se/gdp_formas", keyEnv: "FORMAS_GDP_API_KEY" },
} as const;
export type GdpAdapter = keyof typeof GDP_FUNDERS;

type GdpCall = {
  diarienummer: string;
  titel: string | null;
  beskrivning: string | null;
  status: "Kommande" | "Pågående" | "Avslutad" | null;
  budgetBelopp: number | null;
  budgetValuta: string | null;
  oppningsdatum: string | null;
  stangningsdatum: string | null;
  publiceringsplatser: { webbadress: string | null }[] | null;
};

function date(v: string | null, endOfDay = false): Date | null {
  if (!v) return null;
  return stockholmTime(endOfDay ? `${v.slice(0, 10)}T23:59:59` : v.slice(0, 10));
}

// GDP dates are days; a call is open through its closing day (Swedish time).
export function parseGdpCalls(calls: GdpCall[], now: number): RawCall[] {
  return calls
    .filter((c) => c.status !== "Avslutad" && c.titel?.trim())
    .map((c) => {
      const close = date(c.stangningsdatum, true);
      return {
        externalId: c.diarienummer,
        title: c.titel!.trim(),
        url: c.publiceringsplatser?.find((p) => p.webbadress)?.webbadress ?? null,
        applyUrl: null,
        sourceDescription: c.beskrivning?.trim() || null,
        eligibilityText: null,
        amountText: null,
        opensAt: date(c.oppningsdatum),
        deadline: close,
        totalBudgetSek: c.budgetValuta === "SEK" && c.budgetBelopp ? Math.round(c.budgetBelopp) : null,
      };
    })
    .filter((c) => !c.deadline || c.deadline.getTime() > now);
}

export function gdpKey(adapter: GdpAdapter): string | null {
  return process.env[GDP_FUNDERS[adapter].keyEnv]?.trim() || null;
}

export async function fetchGdpCalls(adapter: GdpAdapter, now: number): Promise<RawCall[] | null> {
  const key = gdpKey(adapter);
  if (!key) return null;
  const out: GdpCall[] = [];
  for (const status of ["Pågående", "Kommande"]) {
    for (let offset = 0; offset < 2000; offset += 100) {
      const res = await fetch(`${GDP_FUNDERS[adapter].base}/utlysningar?status=${encodeURIComponent(status)}&limit=100&offset=${offset}`, {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(60_000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`GDP (${adapter}) svarade ${res.status}`);
      const page = (await res.json()) as GdpCall[];
      out.push(...page);
      if (page.length < 100) break;
    }
  }
  return parseGdpCalls(out, now);
}
