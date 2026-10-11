import { stockholmTime, type RawCall } from "./types";

// Vinnova's open data API (data.vinnova.se, CC0, no key). An
// "ansökningsomgång" is one round you can apply to, with its own closing
// date — that is what GoodTribes calls an utlysning. The date in the URL
// returns rounds changed on or after it.
//
// WebTextLista's TextID 1–3 are the three short texts on Vinnova's own
// call page: what you can apply for, who can apply, and how much.
const BASE = "https://data.vinnova.se/api/ansokningsomgangar";
const FINDER = "https://www.vinnova.se/sok-finansiering/hitta-finansiering/";

type VinnovaRound = {
  Diarienummer: string;
  Titel: string | null;
  Beskrivning: string | null;
  Oppningsdatum: string | null;
  Stangningsdatum: string | null;
  Publik: number;
  LankLista?: { Beskrivning: string | null; URL: string | null }[];
  WebTextLista?: { TextID: number; TextSv: string | null }[];
};

// Vinnova marks a missing date as 1900-01-01.
function date(v: string | null | undefined): Date | null {
  if (!v || v.startsWith("1900")) return null;
  return stockholmTime(v);
}

function text(round: VinnovaRound, id: number): string | null {
  return round.WebTextLista?.find((w) => w.TextID === id)?.TextSv?.trim() || null;
}

// Only public rounds that are still open (or not yet open) are kept.
export function parseVinnovaRounds(rounds: VinnovaRound[], now: number): RawCall[] {
  return rounds
    .filter((r) => r.Publik === 1 && r.Titel?.trim())
    .map((r) => {
      const deadline = date(r.Stangningsdatum);
      const links = (r.LankLista ?? []).filter((l) => l.URL);
      const apply = links.find((l) => l.URL!.includes("ansok.vinnova.se"));
      const info = links.find((l) => !l.URL!.includes("ansok.vinnova.se"));
      return {
        externalId: r.Diarienummer,
        title: r.Titel!.trim(),
        url: info?.URL ?? FINDER,
        applyUrl: apply?.URL ?? null,
        sourceDescription: r.Beskrivning?.trim() || text(r, 1),
        eligibilityText: text(r, 2),
        amountText: text(r, 3),
        opensAt: date(r.Oppningsdatum),
        deadline,
        totalBudgetSek: null,
      };
    })
    .filter((c) => c.deadline && c.deadline.getTime() > now);
}

export async function fetchVinnovaCalls(since: Date, now: number): Promise<RawCall[]> {
  const res = await fetch(`${BASE}/${since.toISOString().slice(0, 10)}`, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
  if (!res.ok) throw new Error(`Vinnova svarade ${res.status}`);
  return parseVinnovaRounds((await res.json()) as VinnovaRound[], now);
}
