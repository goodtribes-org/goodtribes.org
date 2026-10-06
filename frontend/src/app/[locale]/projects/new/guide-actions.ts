"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { getAiClientFor } from "@/lib/aiMode";
import { createProjectRecord } from "@/lib/createProject";
import { MAX_DRAFTS, listOwnDrafts, type OwnDraft } from "@/lib/projectVisibility";
import { openChallengeBySlug } from "@/lib/challenges";
import { revalidatePath } from "next/cache";
import { escapeHtml } from "@/lib/renderBody";
import { markChecklistDone } from "@/app/[locale]/projects/[slug]/guide/actions";
import { createProjectFromDream } from "./samtal/actions";
import { checkRateLimit } from "@/lib/rateLimit";
import { dropStashedGuideInput, stashGuideInput } from "@/lib/dreamGuideStash";
import { indexDocuments } from "@/lib/meili";
import { guardSocialAction } from "@/lib/socialActionGuard";
import { runProactiveModeration } from "@/lib/proactiveModeration";
import { IDEAS_LIST_TAG, invalidateListCache } from "@/lib/listCache";
import { linkProjectToIdea } from "@/lib/promoteIdea";
import { findSimilarIdeas, type SimilarIdea } from "@/lib/similarIdeas";
import {
  GUIDE_AREAS,
  MAX_ANSWER_LENGTH,
  WEEKLY_HOURS,
  fallbackTitle,
  isVagueAnswer,
  parseGuideInput,
  type GuideArea,
  type GuideInput,
} from "@/lib/dreamGuide";

const FOLLOW_UP_MODEL = "claude-haiku-4-5-20251001";

async function localized(path: string): Promise<string> {
  return `/${await getLocale()}${path}`;
}

function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const NO_FOLLOW_UP = "INGEN";

// A follow-up on a vague answer. With AI, the model words it from the
// answer (one small call, only for answers isVagueAnswer flags) or says none
// is needed; without AI, or logged out, null — the guide then shows its fixed
// follow-up. Logged-out visitors never trigger an AI call: there is no user
// to rate-limit.
export async function suggestGuideFollowUp(
  area: string,
  answer: string,
): Promise<{ question: string } | { none: true } | null> {
  if (!(GUIDE_AREAS as readonly string[]).includes(area)) return null;
  const text = answer.trim().slice(0, MAX_ANSWER_LENGTH);
  if (!isVagueAnswer(text)) return null;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAiProjectStartAvailable(userId))) return null;

  const gate = await getAiClientFor({ feature: "dream-conversation", kind: "assist", userId, projectId: null });
  if (!gate.ok) return null;
  const t = await getTranslations("DreamGuide");
  try {
    const response = await gate.client.messages.create(
      {
        model: FOLLOW_UP_MODEL,
        max_tokens: 200,
        system:
          "Du är Idécoachen på GoodTribes.org. En initiativtagare har svarat vagt på en fråga om sin idé. " +
          "Ställ EN kort, vänlig följdfråga som leder till något konkret (vem, var, hur märks det). " +
          "Ge inga råd och hitta inte på något. Svara bara med frågan, på samma språk som svaret. " +
          `Om svaret redan är konkret nog, svara bara: ${NO_FOLLOW_UP}`,
        messages: [{ role: "user", content: `Fråga: ${t(`questions.${area as GuideArea}.title`)}\nSvar: ${text}` }],
      },
      { timeout: 20_000, maxRetries: 0 },
    );
    const block = response.content.find((b) => b.type === "text");
    const question = block && block.type === "text" ? block.text.trim().slice(0, 300) : "";
    if (question.replace(/[^\p{L}]/gu, "").toUpperCase() === NO_FOLLOW_UP) return { none: true };
    return question ? { question } : null;
  } catch {
    return null;
  }
}

// Before a logged-out visitor goes to log in: keeps the answers on the
// server so they follow the magic link to whatever origin or browser it
// opens in (see dreamGuideStash.ts). Returns the id for the callbackUrl, or
// null (Redis down, or too many from one address) — localStorage still has
// them then. No login needed, so it's rate-limited per address.
export async function stashGuide(raw: unknown): Promise<string | null> {
  const input = parseGuideInput(raw);
  if (!GUIDE_AREAS.some((a) => input.answers[a])) return null;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`dream-guide-stash:${ip}`, 20, 60 * 60))) return null;
  return stashGuideInput(input);
}

// "Liknande idéer finns redan" on the summary (#236): shared ideas that look
// like the dream, so someone can join one instead of starting a duplicate.
// No login needed (search is public), so it's rate-limited per address.
export async function similarIdeasForGuide(text: string): Promise<SimilarIdea[]> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`dream-guide-similar:${ip}`, 30, 60 * 60))) return [];
  return findSimilarIdeas(text.slice(0, MAX_ANSWER_LENGTH), { locale: await getLocale() });
}

// "Skapa mitt projekt". Login happens here, not before the questions: the
// guide keeps the answers through the login round trip and calls this again.
export async function createProjectFromGuide(raw: unknown, stashId?: string): Promise<{ draftLimit: OwnDraft[] } | void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect(await localized(`/login?callbackUrl=${encodeURIComponent(await localized("/projects/new"))}`));

  const input = parseGuideInput(raw);
  if (!GUIDE_AREAS.some((a) => input.answers[a])) throw new Error("Svara på minst en fråga först.");
  // A new project is a draft (#226), at most MAX_DRAFTS at a time. Sharing
  // the dream as an idea, or driving someone's idea (published at once),
  // doesn't count. Checked before anything is created or any AI spent; the
  // guide then shows the drafts to publish or remove.
  if (!input.share && !input.basedOnIdeaId) {
    const drafts = await listOwnDrafts(userId);
    if (drafts.length >= MAX_DRAFTS) return { draftLimit: drafts };
  }
  const t = await getTranslations("DreamGuide");
  const openQuestions = input.unknown.map((a) => t(`questions.${a}.title`));
  // The project is being made from these answers: don't offer them again.
  if (stashId) await dropStashedGuideInput(stashId);

  if (input.share) await shareAsIdea(input, userId, openQuestions, t);

  if (input.withAi && (await isAiProjectStartAvailable(userId))) {
    await createWithAi(input, userId, openQuestions, t);
  }
  await createWithoutAi(input, userId, openQuestions, t);
}

type T = Awaited<ReturnType<typeof getTranslations<"DreamGuide">>>;

// With AI: the answers become a Drömsamtal transcript, and Drömsamtalet's
// own "Skapa mitt projekt" takes it from there — name and texts, SDG, cards,
// the Idé fill. One chain for both ways in, nothing duplicated.
async function createWithAi(input: GuideInput, userId: string, openQuestions: string[], t: T) {
  const aiUser = await getAiParticipantUser();
  const room = await prisma.room.create({ data: { type: "AI_INTAKE" } });
  await prisma.roomParticipant.create({ data: { roomId: room.id, userId } });

  const messages: { authorId: string; isAi: boolean; body: string }[] = [];
  const ask = (q: string) => messages.push({ authorId: aiUser.id, isAi: true, body: `<p>${escapeHtml(q)}</p>` });
  const say = (a: string) => messages.push({ authorId: userId, isAi: false, body: paragraphs(a) });
  for (const area of GUIDE_AREAS) {
    ask(t(`questions.${area}.title`));
    if (input.unknown.includes(area)) say(t("unknownAnswer"));
    else if (input.answers[area]) say(input.answers[area]!);
    else continue;
    const f = input.followUps[area];
    if (f) {
      ask(f.question);
      say(f.answer);
    }
  }
  const conditions = conditionsText(input, t);
  if (conditions) {
    ask(t("conditions.heading"));
    say(conditions);
  }
  // One at a time, so createdAt keeps the conversation's order.
  for (const m of messages) await prisma.message.create({ data: { roomId: room.id, ...m } });

  const covered = [...GUIDE_AREAS.filter((a) => input.answers[a]), ...(conditions ? ["conditions"] : [])];
  await prisma.dreamConversation.create({
    // basedOnIdeaId (#233): createProjectFromDream links the project to it.
    data: {
      roomId: room.id,
      userId,
      aiMode: "AGENT",
      state: { covered, notes: {}, ...(input.basedOnIdeaId ? { basedOnIdeaId: input.basedOnIdeaId } : {}) },
      openQuestions,
    },
  });
  // Redirects to the new project's Idé page.
  await createProjectFromDream(room.id);
}

// Without AI: the answers are the project's description, word for word.
async function createWithoutAi(input: GuideInput, userId: string, openQuestions: string[], t: T) {
  const sections = GUIDE_AREAS.filter((a) => input.answers[a]).map((a) => {
    const f = input.followUps[a];
    return `<h3>${escapeHtml(t(`questions.${a}.area`))}</h3>${paragraphs(input.answers[a]!)}${f ? paragraphs(f.answer) : ""}`;
  });
  const project = await createProjectRecord({
    title: fallbackTitle(input),
    ownerId: userId,
    summary: input.answers.dream?.slice(0, 300) ?? null,
    description: sections.join(""),
    aiMode: "MANUAL",
    // Driving a shared idea is public from the start (#226).
    publish: !!input.basedOnIdeaId,
  });

  const { time, team, ambition } = input.conditions;
  if (time || team || ambition) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(time ? { weeklyHours: WEEKLY_HOURS[time] } : {}),
        ...(team ? { teamMode: team } : {}),
        ...(ambition ? { ambition } : {}),
      },
    });
  }
  // "Vet inte än" → a card each in the Idé phase, the founder's own.
  if (openQuestions.length) {
    await prisma.kanbanCard.createMany({
      data: openQuestions.map((q, i) => ({
        projectSlug: project.slug,
        title: q,
        description: t("openQuestionCard"),
        column: "BACKLOG" as const,
        phase: "IDEA" as const,
        order: i,
        createdById: userId,
      })),
    });
  }
  if (input.basedOnIdeaId) await linkProjectToIdea(input.basedOnIdeaId, project.id, userId);
  await markChecklistDone(project.id, "dream_defined", userId);
  redirect(await localized(`/projects/${project.slug}/ide`));
}

// "Någon annan får driva det" (#234): the answers become an Idea in
// Idéflödet, word for word and without AI, so anyone can take it forward.
// The dream is the card text (description). The idea page shows only
// problem and solution, so problem carries every area under its own label
// (the dream first) and solution the idea.
async function shareAsIdea(input: GuideInput, userId: string, openQuestions: string[], t: T) {
  const guard = await guardSocialAction(userId, "post");
  if (!guard.ok) throw new Error(guard.error);
  const text = (a: GuideArea) => {
    if (!input.answers[a]) return null;
    const f = input.followUps[a];
    return [input.answers[a]!, f?.answer].filter(Boolean).join("\n\n");
  };
  const labelled = (a: GuideArea) => {
    const body = text(a);
    return body ? `${t(`questions.${a}.area`)}\n${body}` : null;
  };
  const problem =
    [
      labelled("dream"),
      labelled("problem"),
      labelled("why_you"),
      labelled("people"),
      openQuestions.length ? `${t("summary.openQuestionsLabel")}\n${openQuestions.map((q) => `– ${q}`).join("\n")}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;
  const solution = text("idea");
  const description = text("dream");

  // An answer to an organisation's challenge (#228) — only while it's open.
  const challenge = await openChallengeBySlug(input.challengeSlug);
  const idea = await prisma.idea.create({
    // sdgGoals is NOT NULL without a default in the table; tags as the
    // idea form leaves them. SDGs can be picked on the idea afterwards.
    data: {
      title: fallbackTitle(input), description, problem, solution, sdgGoals: [], tags: [], status: "open", authorId: userId,
      ...(challenge ? { challengeId: challenge.id } : {}),
    },
  });
  await prisma.ideaContributor.create({ data: { ideaId: idea.id, userId, role: "author" } }).catch(() => {});
  await runProactiveModeration({
    targetType: "Idea",
    targetId: idea.id,
    authorId: userId,
    text: [idea.title, description, problem, solution].filter(Boolean).join("\n\n"),
    url: `/ideas/${idea.id}`,
  });
  void indexDocuments("ideas", [
    { id: `idea-${idea.id}`, type: "idea", title: idea.title, description: problem ?? description ?? "", url: `/ideas/${idea.id}`, locale: "sv" },
  ]);
  invalidateListCache(IDEAS_LIST_TAG);
  if (challenge) revalidatePath(`/challenges/${challenge.slug}`);
  redirect(await localized(`/ideas/${idea.id}`));
}

function conditionsText(input: GuideInput, t: T): string {
  const { time, team, ambition } = input.conditions;
  return [
    time && `${t("conditions.time")}: ${t(`conditions.timeOptions.${time}`)}`,
    team && `${t("conditions.team")}: ${t(`conditions.teamOptions.${team}`)}`,
    ambition && `${t("conditions.ambition")}: ${t(`conditions.ambitionOptions.${ambition}`)}`,
    input.name && `${t("conditions.name")}: ${input.name}`,
  ]
    .filter(Boolean)
    .join("\n");
}
