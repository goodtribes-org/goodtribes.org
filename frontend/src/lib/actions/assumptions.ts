"use server";

import type { AssumptionOrigin, AssumptionRisk, AssumptionStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { aiGateMessage, getAiClientFor } from "@/lib/aiMode";
import { cachedSystemBlock } from "@/lib/anthropic";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import { CANVAS_FIELD_KEYS, latestInsight, splitFieldKey, type CritiqueContent, type SynthesisContent } from "@/lib/ideaInsights";
import { logger } from "@/lib/logger";
import {
  MAX_ASSUMPTION_NOTE,
  MAX_ASSUMPTION_TEXT,
  parseAssumptionProposals,
  RISKS,
  STATUSES,
  statusHintsFromSynthesis,
  type AssumptionProposal,
} from "@/lib/assumptionRules";
import { FIND_ASSUMPTIONS_SYSTEM_PROMPT, FIND_ASSUMPTIONS_TOOL } from "@/lib/prompts/assumptions";

// The Idé phase's assumptions: written by the team, accepted from AI
// proposals, or made from a Kritikern point. Only project leads edit them,
// same as the canvas they sit behind. Every action returns {error} rather
// than throwing, so the UI can show why.

type Result = { error?: string };

async function requireLead(projectId: string): Promise<string | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasProjectRole(projectId, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Bara projektledningen kan göra det här." };
  return session.user.id;
}

type Denied = { error: string };

async function leadForSlug(slug: string): Promise<Denied | { project: { id: string; slug: string }; userId: string }> {
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!project) return { error: "Projektet hittades inte" };
  const userId = await requireLead(project.id);
  if (typeof userId !== "string") return userId;
  return { project, userId };
}

async function leadForAssumption(id: string) {
  const a = await prisma.assumption.findUnique({ where: { id }, include: { project: { select: { id: true, slug: true } } } });
  if (!a) return { error: "Antagandet finns inte längre." } as Denied;
  const userId = await requireLead(a.projectId);
  if (typeof userId !== "string") return userId;
  return { assumption: a, userId };
}

function revalidate(slug: string) {
  revalidatePath(`/projects/${slug}`, "layout");
}

const clip = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

async function create(
  projectId: string,
  userId: string,
  p: { text: string; risk: AssumptionRisk; testPlan: string | null; fieldKey: string | null; origin: AssumptionOrigin },
) {
  const source = p.fieldKey ? splitFieldKey(p.fieldKey) : null;
  await prisma.assumption.create({
    data: {
      projectId,
      text: p.text,
      risk: p.risk,
      testPlan: p.testPlan,
      sourceEntity: source?.entity ?? null,
      sourceField: source?.field ?? null,
      origin: p.origin,
      createdById: userId,
      updatedById: userId,
    },
  });
}

export async function createAssumption(slug: string, input: { text: string; risk?: string; testPlan?: string; fieldKey?: string | null }): Promise<Result> {
  const ctx = await leadForSlug(slug);
  if ("error" in ctx) return { error: ctx.error };
  const text = clip(input.text, MAX_ASSUMPTION_TEXT);
  if (!text) return { error: "Skriv antagandet först." };
  const risk = RISKS.includes(input.risk as AssumptionRisk) ? (input.risk as AssumptionRisk) : "MEDIUM";
  const fieldKey = input.fieldKey && CANVAS_FIELD_KEYS.includes(input.fieldKey) ? input.fieldKey : null;
  await create(ctx.project.id, ctx.userId, { text, risk, testPlan: clip(input.testPlan, MAX_ASSUMPTION_NOTE), fieldKey, origin: "USER" });
  revalidate(slug);
  return {};
}

export async function updateAssumption(
  id: string,
  patch: { text?: string; risk?: string; status?: string; testPlan?: string; evidence?: string },
): Promise<Result> {
  const ctx = await leadForAssumption(id);
  if ("error" in ctx) return { error: ctx.error };
  const data: { text?: string; risk?: AssumptionRisk; status?: AssumptionStatus; testPlan?: string | null; evidence?: string | null; updatedById: string } = {
    updatedById: ctx.userId,
  };
  if (patch.text !== undefined) {
    const text = clip(patch.text, MAX_ASSUMPTION_TEXT);
    if (!text) return { error: "Antagandet kan inte vara tomt." };
    data.text = text;
  }
  if (patch.risk !== undefined) {
    if (!RISKS.includes(patch.risk as AssumptionRisk)) return { error: "Okänd risknivå" };
    data.risk = patch.risk as AssumptionRisk;
  }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status as AssumptionStatus)) return { error: "Okänd status" };
    data.status = patch.status as AssumptionStatus;
  }
  if (patch.testPlan !== undefined) data.testPlan = clip(patch.testPlan, MAX_ASSUMPTION_NOTE);
  if (patch.evidence !== undefined) data.evidence = clip(patch.evidence, MAX_ASSUMPTION_NOTE);
  await prisma.assumption.update({ where: { id }, data });
  revalidate(ctx.assumption.project.slug);
  return {};
}

export async function deleteAssumption(id: string): Promise<Result> {
  const ctx = await leadForAssumption(id);
  if ("error" in ctx) return { error: ctx.error };
  await prisma.assumption.delete({ where: { id } });
  revalidate(ctx.assumption.project.slug);
  return {};
}

// "Hitta antaganden": AI proposals from the canvas, returned to the UI and
// never stored — the team ticks the ones worth keeping (acceptAssumptions).
// Haiku: a short, schema-constrained list. Follows the canvas step's AI mode.
export async function findAssumptions(slug: string): Promise<{ proposals: AssumptionProposal[] } | { error: string }> {
  const ctx = await leadForSlug(slug);
  if ("error" in ctx) return { error: ctx.error };
  const project = await prisma.project.findUnique({
    where: { id: ctx.project.id },
    select: { title: true, summary: true, contentLocale: true, leanCanvas: true, valueProposition: true, impactModel: true, assumptions: { select: { text: true } } },
  });
  if (!project) return { error: "Projektet hittades inte" };

  const rows: Record<string, Record<string, unknown> | null> = {
    leanCanvas: project.leanCanvas as Record<string, unknown> | null,
    valueProposition: project.valueProposition as Record<string, unknown> | null,
    impactModel: project.impactModel as Record<string, unknown> | null,
  };
  const labels = await getCanvasFieldLabels(project.contentLocale);
  const lines = CANVAS_FIELD_KEYS.flatMap((key) => {
    const k = splitFieldKey(key);
    const v = k ? rows[k.entity]?.[k.field] : null;
    return typeof v === "string" && v.trim() ? [`${key} (${labels[key] ?? key}): ${v.trim()}`] : [];
  });
  if (lines.length < 2) return { error: "Fyll i några fält i canvasen först — då finns det något att hitta antaganden i." };

  const gate = await getAiClientFor({ feature: "canvas-review", kind: "assist", userId: ctx.userId, projectId: ctx.project.id, stepKey: "lean_canvas_created", language: "project" });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };

  const existing = project.assumptions.map((a) => a.text);
  const content = [
    `Projekt: ${project.title}${project.summary ? ` — ${project.summary}` : ""}`,
    `Canvasfält:\n${lines.join("\n")}`,
    existing.length ? `Teamets antaganden (föreslå inte dessa igen):\n${existing.map((t) => `- ${t}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await gate.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: cachedSystemBlock(FIND_ASSUMPTIONS_SYSTEM_PROMPT),
      tools: [FIND_ASSUMPTIONS_TOOL],
      tool_choice: { type: "tool", name: FIND_ASSUMPTIONS_TOOL.name },
      messages: [{ role: "user", content }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const proposals = parseAssumptionProposals(toolUse && toolUse.type === "tool_use" ? toolUse.input : null, content, CANVAS_FIELD_KEYS, existing);
    if (!proposals.length) return { error: "Hittade inga nya antaganden just nu — försök igen." };
    return { proposals };
  } catch (err) {
    logger.error("find assumptions failed", { projectId: ctx.project.id, err: String(err) });
    return { error: "Kunde inte hitta antaganden just nu — försök igen." };
  }
}

export async function acceptAssumptions(slug: string, proposals: AssumptionProposal[]): Promise<Result> {
  const ctx = await leadForSlug(slug);
  if ("error" in ctx) return { error: ctx.error };
  // Re-validated server-side: the client only sends back what it was given,
  // but nothing from the browser is trusted as-is.
  const clean = (Array.isArray(proposals) ? proposals : []).slice(0, 7).flatMap((p) => {
    const text = clip(p?.text, MAX_ASSUMPTION_TEXT);
    if (!text) return [];
    return [
      {
        text,
        risk: RISKS.includes(p.risk) ? p.risk : ("MEDIUM" as AssumptionRisk),
        testPlan: clip(p.testPlan, MAX_ASSUMPTION_NOTE),
        fieldKey: p.fieldKey && CANVAS_FIELD_KEYS.includes(p.fieldKey) ? p.fieldKey : null,
        origin: "AI" as const,
      },
    ];
  });
  if (!clean.length) return { error: "Välj minst ett antagande." };
  for (const p of clean) await create(ctx.project.id, ctx.userId, p);
  revalidate(slug);
  return {};
}

// "Gör till antagande" on a Kritikern point. Points have no ids (they're
// replaced wholesale on every re-run), so the point is addressed by its
// text and looked up in the latest critique — a stale click after a
// re-run simply finds nothing.
export async function assumptionFromCritique(slug: string, pointText: string): Promise<Result> {
  const ctx = await leadForSlug(slug);
  if ("error" in ctx) return { error: ctx.error };
  const critique = await latestInsight<CritiqueContent>(ctx.project.id, "CRITIQUE");
  const point = critique?.content.points.find((p) => p.text === pointText);
  if (!point) return { error: "Kritikern har körts om — punkten finns inte längre." };
  const dup = await prisma.assumption.findFirst({ where: { projectId: ctx.project.id, text: point.text }, select: { id: true } });
  if (dup) return { error: "Det antagandet finns redan." };
  await create(ctx.project.id, ctx.userId, {
    text: point.text.slice(0, MAX_ASSUMPTION_TEXT),
    risk: point.severity === "high" ? "HIGH" : "MEDIUM",
    testPlan: null,
    fieldKey: point.field,
    origin: "CRITIQUE",
  });
  revalidate(slug);
  return {};
}

// Accepting an interview-synthesis hint: recomputed server-side from the
// latest synthesis (never trusting a status sent from the browser), then
// the status is set and the synthesis's reason added to the evidence.
export async function applyInterviewHint(id: string): Promise<Result> {
  const ctx = await leadForAssumption(id);
  if ("error" in ctx) return { error: ctx.error };
  const synthesis = await latestInsight<SynthesisContent>(ctx.assumption.projectId, "INTERVIEW_SYNTHESIS");
  const hint = statusHintsFromSynthesis([ctx.assumption], synthesis?.content.verdicts ?? [])[0];
  if (!hint) return { error: "Intervjusammanfattningen säger inget om det här längre." };
  const note = `Intervjuer: ${hint.reason}`;
  const evidence = ctx.assumption.evidence ? `${ctx.assumption.evidence}\n${note}` : note;
  await prisma.assumption.update({
    where: { id },
    data: { status: hint.status, evidence: evidence.slice(0, MAX_ASSUMPTION_NOTE), updatedById: ctx.userId },
  });
  revalidate(ctx.assumption.project.slug);
  return {};
}
