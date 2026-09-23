import type { FieldAuthor, FieldKnowledgeStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LEAN_CANVAS_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "@/app/[locale]/projects/[slug]/(workspace)/value-proposition/fields";

// Every field whose provenance (vet/antar, who wrote it, sources) is
// tracked, keyed by entity. The entity key is what's stored in
// FieldProvenance.entity; the field names are the model's column names.
export const PROVENANCE_FIELDS = {
  project: ["title", "summary", "description", "category", "tags", "sdgGoals"],
  leanCanvas: LEAN_CANVAS_FIELDS,
  valueProposition: VALUE_PROPOSITION_FIELDS,
} as const satisfies Record<string, readonly string[]>;

export type ProvenanceEntity = keyof typeof PROVENANCE_FIELDS;

export function isProvenanceField(entity: string, field: string): entity is ProvenanceEntity {
  return (
    Object.prototype.hasOwnProperty.call(PROVENANCE_FIELDS, entity) &&
    (PROVENANCE_FIELDS[entity as ProvenanceEntity] as readonly string[]).includes(field)
  );
}

export type ProvenanceInfo = {
  status: FieldKnowledgeStatus;
  author: FieldAuthor;
};

type FieldValue = string | string[] | number[] | null | undefined;

function isEmpty(value: FieldValue): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim() === "";
}

function sameValue(a: FieldValue, b: FieldValue): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  return (a ?? "").trim() === (b ?? "").trim();
}

// ─── The rule: AI never overwrites a human ──────────────────────────────────

// AI may write a field only if it's empty, or if its current content is an
// untouched AI draft. A field with content but no provenance row predates
// provenance tracking and counts as human-written. Anything else must be
// offered as a suggestion next to the field instead.
export function canAiWrite(currentValue: FieldValue, provenance: ProvenanceInfo | null | undefined): boolean {
  if (isEmpty(currentValue)) return true;
  return provenance?.author === "AI";
}

// What a human edit does to a field's provenance: editing an AI draft makes
// it AI_EDITED, anything else is USER. The vet/antar status is left as it
// was (an edit doesn't make an assumption known); a new row starts ANTAR.
export function provenanceAfterHumanEdit(previous: ProvenanceInfo | null | undefined): ProvenanceInfo {
  const author: FieldAuthor = previous?.author === "AI" || previous?.author === "AI_EDITED" ? "AI_EDITED" : "USER";
  return { author, status: previous?.status ?? "ANTAR" };
}

// ─── Reading and writing ────────────────────────────────────────────────────

export async function getFieldProvenance(
  projectId: string,
  entity: ProvenanceEntity,
): Promise<Record<string, ProvenanceInfo>> {
  const rows = await prisma.fieldProvenance.findMany({
    where: { projectId, entity },
    select: { field: true, status: true, author: true },
  });
  return Object.fromEntries(rows.map((r) => [r.field, { status: r.status, author: r.author }]));
}

// Call after a human saves one or more fields. Only fields whose value
// actually changed are recorded — saving a form that also re-submits
// untouched fields must not turn someone else's AI draft into "USER".
export async function recordHumanEdits(
  projectId: string,
  entity: ProvenanceEntity,
  // The row as it was before the save — may be the whole model row; only
  // the keys present in `after` are compared.
  before: Readonly<Record<string, unknown>> | null,
  after: Record<string, FieldValue>,
  userId: string,
): Promise<void> {
  const changed = Object.keys(after).filter(
    (field) => isProvenanceField(entity, field) && !sameValue(before?.[field] as FieldValue, after[field]),
  );
  if (changed.length === 0) return;

  const existing = await getFieldProvenance(projectId, entity);
  await prisma.$transaction(
    changed.map((field) => {
      const next = provenanceAfterHumanEdit(existing[field]);
      return prisma.fieldProvenance.upsert({
        where: { projectId_entity_field: { projectId, entity, field } },
        create: { projectId, entity, field, ...next, updatedById: userId },
        update: { author: next.author, updatedById: userId },
      });
    }),
  );
}

// Call when AI writes a field (always after checking canAiWrite). status
// is VET only for what the user themselves said; anything AI inferred is
// ANTAR.
export async function recordAiWrite(
  db: Prisma.TransactionClient | typeof prisma,
  params: {
    projectId: string;
    entity: ProvenanceEntity;
    field: string;
    status: FieldKnowledgeStatus;
    sources?: Prisma.InputJsonValue;
  },
): Promise<void> {
  const { projectId, entity, field, status, sources } = params;
  if (!isProvenanceField(entity, field)) throw new Error(`Unknown provenance field ${entity}.${field}`);
  await db.fieldProvenance.upsert({
    where: { projectId_entity_field: { projectId, entity, field } },
    create: { projectId, entity, field, status, author: "AI", sources, updatedById: null },
    update: { status, author: "AI", sources, updatedById: null },
  });
}

export async function setFieldKnowledgeStatus(
  projectId: string,
  entity: ProvenanceEntity,
  field: string,
  status: FieldKnowledgeStatus,
  userId: string,
): Promise<void> {
  if (!isProvenanceField(entity, field)) throw new Error(`Unknown provenance field ${entity}.${field}`);
  // A field with no row yet was written by a human before tracking began.
  await prisma.fieldProvenance.upsert({
    where: { projectId_entity_field: { projectId, entity, field } },
    create: { projectId, entity, field, status, author: "USER", updatedById: userId },
    update: { status, updatedById: userId },
  });
}
