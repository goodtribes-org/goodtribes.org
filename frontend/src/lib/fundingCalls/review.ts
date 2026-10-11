import type { FundingApplicantType, GoodTribesEntityKind, GoodTribesEntityStatus } from "@prisma/client";

// Utlysningar (#346): an application in a GoodTribes entity's name is
// reviewed before it is submitted, because GoodTribes then takes legal and
// financial responsibility. Three steps: a completeness check (here, by
// rules — an AI check can be added behind a flag later), identity and roles
// (confirmed by the reviewer by hand until there is BankID), and a human
// decision. Pure: the actions, the queue and the tests read the same rules.

const DAY = 24 * 60 * 60 * 1000;

// Here, not in the client editor: a server page can't read plain values
// exported from a "use client" module.
export const KIND_LABELS: Record<GoodTribesEntityKind, string> = { LIMITED_COMPANY: "Aktiebolag (dotterbolag)", FOUNDATION: "Stiftelse", NONPROFIT: "Ideell enhet", PARTNER: "Partner i teamet" };
export const STATUS_LABELS: Record<GoodTribesEntityStatus, string> = { PLANNED: "Planerad", EXISTS: "Finns", OPEN_QUESTION: "Öppen fråga" };

// ÖPPEN FRÅGA (#342): how many days before the funder's deadline an
// application must reach GoodTribes' review. Default 7; set
// FUNDING_REVIEW_LEAD_DAYS to change.
export function reviewLeadDays(): number {
  const n = Number(process.env.FUNDING_REVIEW_LEAD_DAYS);
  return Number.isInteger(n) && n >= 0 ? n : 7;
}

type Entity = { id: string; kind: GoodTribesEntityKind; status: GoodTribesEntityStatus; applicantTypes: FundingApplicantType[] };

// A partner applying itself isn't GoodTribes applying: no review needed.
export function needsGoodTribesReview(entity: { kind: GoodTribesEntityKind } | null | undefined): boolean {
  return !!entity && entity.kind !== "PARTNER";
}

// Which entity should apply, from who the call is open to. A subsidiary (an
// AB) before the foundation where both fit, so the legal risk lands there.
// Only entities that exist; partners are chosen by hand. The review approves
// the choice.
const PREFERENCE: GoodTribesEntityKind[] = ["LIMITED_COMPANY", "NONPROFIT", "FOUNDATION"];

export function suggestEntity(callTypes: FundingApplicantType[], entities: Entity[]): string | null {
  const fits = entities.filter(
    (e) => e.status === "EXISTS" && e.kind !== "PARTNER" && (callTypes.length === 0 || e.applicantTypes.some((t) => callTypes.includes(t))),
  );
  fits.sort((a, b) => PREFERENCE.indexOf(a.kind) - PREFERENCE.indexOf(b.kind));
  return fits[0]?.id ?? null;
}

// "Krävs ej" and the like mean no co-funding is needed.
function cofundingRequired(cofunding: string | null): boolean {
  if (!cofunding?.trim()) return false;
  return !/kr[äa]vs\s*(ej|inte)|ingen\s+medfinansiering|not\s+required/i.test(cofunding);
}

export type CheckInput = {
  requirements: string[];
  requirementsDone: string[];
  amountRequestedSek: number | null;
  amountMinSek: number | null;
  amountMaxSek: number | null;
  cofunding: string | null;
  cofundingNote: string | null;
  deadline: Date | null;
  entityChosen: boolean;
  // The chosen entity is only planned (or an open question), not formed.
  entityNotFormed?: boolean;
  now: number;
  leadDays: number;
};

// The completeness check: what's missing, one line each. Empty = ready for
// the human review. Never a long text — a list to work through.
export function completenessFindings(c: CheckInput): string[] {
  const out: string[] = [];
  if (!c.entityChosen) out.push("Välj vilken GoodTribes-enhet som ska stå som sökande");
  else if (c.entityNotFormed) out.push("Den valda enheten är inte bildad än och kan inte stå som sökande");
  for (const r of c.requirements) if (!c.requirementsDone.includes(r)) out.push(`Saknas i ansökan: ${r}`);
  if (c.amountRequestedSek == null) out.push("Ange hur mycket ni söker");
  else {
    if (c.amountMaxSek != null && c.amountRequestedSek > c.amountMaxSek) out.push(`Ni söker mer än utlysningens högsta belopp (${c.amountMaxSek} kr)`);
    if (c.amountMinSek != null && c.amountRequestedSek < c.amountMinSek) out.push(`Ni söker mindre än utlysningens lägsta belopp (${c.amountMinSek} kr)`);
  }
  if (cofundingRequired(c.cofunding) && !c.cofundingNote?.trim()) out.push("Utlysningen kräver medfinansiering: skriv hur den ordnas");
  if (c.deadline && c.deadline.getTime() - c.now < c.leadDays * DAY) {
    out.push(`GoodTribes behöver minst ${c.leadDays} dagar för granskningen före deadline. Ansökan hinner inte granskas och kan inte lämnas in i GoodTribes namn.`);
  }
  return out;
}

// Who may decide: the entity's own reviewers, or any site admin when the
// entity has none named.
export function canReviewFor(reviewerIds: string[], userId: string, isSiteAdmin: boolean): boolean {
  return reviewerIds.length ? reviewerIds.includes(userId) : isSiteAdmin;
}
