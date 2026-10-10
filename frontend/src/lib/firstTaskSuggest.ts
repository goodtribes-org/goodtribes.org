import type { FirstTaskTime } from "@prisma/client";
import { wrapUntrusted } from "@/lib/untrusted";
import { prisma } from "@/lib/prisma";
import { getAiClientFor } from "@/lib/aiMode";
import { parseOpenQuestions } from "@/lib/dreamConversation";
import { latestInsight, type CritiqueContent } from "@/lib/ideaInsights";
import { getProjectJourney } from "@/lib/projectJourney";
import { FIRST_TASK_TIMES } from "@/lib/firstTasks";

// AI suggests first tasks (#284): "Vad är en sak någon annan kan hjälpa dig
// med den här veckan?" Up to three small, concrete tasks someone from outside
// could do, grounded in the project — its dream, the phase's next step, the
// open questions and Kritikern's main objection. Nothing is saved: the lead
// picks, edits and opens one. AI never invents people, organisations or facts.

const MODEL = "claude-sonnet-4-6";

export type FirstTaskSuggestion = {
  title: string;
  why: string;
  time: FirstTaskTime | null;
  choose: boolean;
  question: string | null;
  source: string;
};

const SYSTEM = `Du hjälper en initiativtagare på GoodTribes.org att öppna sitt projekt för nya människor. Föreslå högst tre "första uppgifter": små, konkreta saker som någon utifrån kan göra för projektet den närmaste veckan.

Regler:
- Varje uppgift ska gå att göra på högst några timmar (eller vara en återkommande insats, som en promenad i veckan), och vara begriplig för någon som aldrig hört talas om projektet.
- Utgå bara från underlaget. Hitta aldrig på personer, organisationer, platser eller siffror som inte står där.
- Bygg på det som behövs nu: fasens nästa steg, de öppna frågorna och Kritikerns invändning. Ange i "source" vad förslaget bygger på, med några ord.
- title: en uppmaning, högst ca 70 tecken ("Följ med och intervjua tre äldre"). why: en mening till hjälparen om varför det behövs.
- time: MIN15, HOUR1, HOURS2_4 eller RECURRING.
- choose: true när det spelar roll vem som gör uppgiften (t.ex. möten med utsatta personer eller barn), annars false. Då kan du också föreslå en kort fråga till den som anmäler sig.
- Föreslå inte det som redan finns bland projektets öppna uppgifter.

Svara genom verktyget "forsta_uppgifter".`;

const TOOL = {
  name: "forsta_uppgifter",
  description: "Förslag på första uppgifter för nya.",
  input_schema: {
    type: "object" as const,
    properties: {
      tasks: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            why: { type: "string" },
            time: { type: "string", enum: [...FIRST_TASK_TIMES] },
            choose: { type: "boolean" },
            question: { type: "string" },
            source: { type: "string" },
          },
          required: ["title", "why", "time", "choose", "source"],
        },
      },
    },
    required: ["tasks"],
  },
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// The model's answer, rebuilt field by field.
export function coerceSuggestions(raw: unknown): FirstTaskSuggestion[] {
  const tasks = (raw as { tasks?: unknown })?.tasks;
  if (!Array.isArray(tasks)) return [];
  return tasks
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      const choose = o.choose === true;
      return {
        title: str(o.title, 200),
        why: str(o.why, 500),
        time: FIRST_TASK_TIMES.find((x) => x === o.time) ?? null,
        choose,
        question: choose ? str(o.question, 300) || null : null,
        source: str(o.source, 200),
      };
    })
    .filter((t) => t.title)
    .slice(0, 3);
}

export type SuggestResult = { ok: true; suggestions: FirstTaskSuggestion[] } | { ok: false; reason: "not_configured" | "mode" | "rate_limited" | "budget_exceeded" | "failed" };

export async function suggestFirstTasks(projectId: string, userId: string): Promise<SuggestResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true, slug: true, title: true, summary: true, description: true, phase: true,
      dreamConversation: { select: { openQuestions: true } },
    },
  });
  if (!project) return { ok: false, reason: "failed" };

  const gate = await getAiClientFor({ feature: "first-tasks", kind: "assist", userId, projectId, language: "project" });
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const [journey, critique, openCards] = await Promise.all([
    getProjectJourney({ id: project.id, slug: project.slug, phase: project.phase }),
    latestInsight<CritiqueContent>(project.id, "CRITIQUE"),
    prisma.kanbanCard.findMany({ where: { projectSlug: project.slug, column: { not: "DONE" } }, select: { title: true }, take: 30 }),
  ]);
  const { getTranslations } = await import("next-intl/server");
  const tChecklist = await getTranslations({ locale: "sv", namespace: "ProjectPhaseChecklist" });
  const text = (html: string | null) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
  const context = [
    `Projekt: ${project.title}`,
    project.summary ? `Sammanfattning: ${project.summary}` : null,
    `Beskrivning: ${text(project.description) || "–"}`,
    `Fas: ${project.phase}${journey.nextStepKey ? `, nästa steg: ${tChecklist(journey.nextStepKey)}` : ""}`,
    `Öppna frågor: ${parseOpenQuestions(project.dreamConversation?.openQuestions).join(" | ") || "inga"}`,
    `Kritikerns viktigaste invändning: ${critique?.content.points[0]?.text ?? "ingen"}`,
    `Projektets öppna uppgifter (föreslå inte dessa igen): ${openCards.map((c) => c.title).join(" | ") || "inga"}`,
  ].filter(Boolean).join("\n");

  try {
    const response = await gate.client.messages.create(
      { model: MODEL, max_tokens: 1200, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name }, messages: [{ role: "user", content: wrapUntrusted("projektets material", context) }] },
      { timeout: 60_000, maxRetries: 1 },
    );
    const block = response.content.find((b) => b.type === "tool_use");
    const suggestions = block && block.type === "tool_use" ? coerceSuggestions(block.input) : [];
    return { ok: true, suggestions };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
