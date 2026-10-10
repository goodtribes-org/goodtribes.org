import { LEAN_CANVAS_FIELDS, type LeanCanvasField } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { plainText } from "@/lib/shareCard";

// Föreslå en ändring (#290): what can be proposed, how a proposal is checked,
// and a word diff for the leads' review. Writing an accepted proposal goes
// through the same code as a lead's own edit (lib/projectTextSave.ts).

export const MAX_PENDING_PER_PROJECT = 3;

export type RevisionTarget =
  | { entity: "project"; key: "summary" | "description" }
  | { entity: "leanCanvas"; key: LeanCanvasField };

const LIMITS = { summary: 500, description: 20_000, canvas: 2_000 } as const;

export function parseRevisionField(field: string): RevisionTarget | null {
  const [entity, key, ...rest] = field.split(".");
  if (rest.length) return null;
  if (entity === "project" && (key === "summary" || key === "description")) return { entity, key };
  if (entity === "leanCanvas" && (LEAN_CANVAS_FIELDS as readonly string[]).includes(key)) return { entity, key: key as LeanCanvasField };
  return null;
}

export const isRichField = (t: RevisionTarget) => t.entity === "project" && t.key === "description";

export type ProposalCheck = { ok: true; value: string } | { ok: false; error: "empty" | "too_long" | "unchanged" };

// The value as it would be saved; the description is sanitized here and
// again wherever it is shown.
export function checkProposal(target: RevisionTarget, raw: string, current: string | null): ProposalCheck {
  const rich = isRichField(target);
  const value = rich ? sanitizeHtml(raw.trim()) : raw.trim();
  const text = rich ? plainText(value) : value;
  if (!text) return { ok: false, error: "empty" };
  const limit = target.entity === "leanCanvas" ? LIMITS.canvas : LIMITS[target.key];
  if (value.length > limit) return { ok: false, error: "too_long" };
  const before = current ?? "";
  if ((rich ? plainText(before) : before.trim()) === text) return { ok: false, error: "unchanged" };
  return { ok: true, value };
}

export type DiffPart = { type: "same" | "add" | "del"; text: string };

// Word-level diff (LCS over words, whitespace kept with the word before it).
// Texts here are at most a few thousand words; a longer pair falls back to
// "all removed, all added" rather than an O(n·m) table that size.
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.match(/\S+\s*/g) ?? [];
  const b = after.match(/\S+\s*/g) ?? [];
  if (a.length * b.length > 4_000_000) {
    return [...(a.length ? [{ type: "del" as const, text: a.join("") }] : []), ...(b.length ? [{ type: "add" as const, text: b.join("") }] : [])];
  }
  const norm = (w: string) => w.trim();
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = norm(a[i]) === norm(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (norm(a[i]) === norm(b[j])) { push("same", b[j]); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) push("del", a[i++]);
    else push("add", b[j++]);
  }
  while (i < a.length) push("del", a[i++]);
  while (j < b.length) push("add", b[j++]);
  return parts;
}

// Both sides as plain text, for the diff (the description is HTML).
export function diffForReview(target: RevisionTarget, base: string | null, proposed: string): DiffPart[] {
  const rich = isRichField(target);
  return wordDiff(rich ? plainText(base ?? "") : base ?? "", rich ? plainText(proposed) : proposed);
}
