import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

// The founder's own words from Drömguiden — the dream ("Vad vill du
// förändra?") and why they do it ("Vad driver dig…") — for the project page
// (#275): the polaroid without an image and "Varför jag gör det här". Their
// words, not the AI's summary, give a project its voice.
//
// Drömguiden keeps no separate copy of the answers: with AI they are the
// messages of the project's AI_INTAKE room (question from the AI, answer from
// the founder), without AI they are the description's <h3> sections. Both
// are read here, in either language the guide ran in.

export type FounderWords = { dream: string | null; why: string | null };

type Labels = { dream: string[]; why: string[]; unknown: string[] };

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// With AI: the founder's message right after the AI asked the question.
export function founderWordsFromMessages(messages: { body: string; isAi: boolean }[], labels: Labels): FounderWords {
  const out: FounderWords = { dream: null, why: null };
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i];
    const next = messages[i + 1];
    if (!m.isAi || next.isAi) continue;
    const q = text(m.body);
    const answer = text(next.body);
    if (!answer || labels.unknown.some((u) => same(u, answer))) continue;
    if (!out.dream && labels.dream.some((l) => same(l, q))) out.dream = answer;
    if (!out.why && labels.why.some((l) => same(l, q))) out.why = answer;
  }
  return out;
}

// Without AI: the text under the "Drömmen" / "Varför du" headings, up to the
// next heading. A follow-up answer sits in the same section; only the first
// paragraph is the answer itself.
export function founderWordsFromDescription(html: string, labels: { dream: string[]; why: string[] }): FounderWords {
  const out: FounderWords = { dream: null, why: null };
  const sections = html.split(/<h3[^>]*>/i).slice(1);
  for (const s of sections) {
    const [heading, rest = ""] = s.split(/<\/h3>/i);
    const first = rest.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? rest;
    const answer = text(first);
    if (!answer) continue;
    const h = text(heading);
    if (!out.dream && labels.dream.some((l) => same(l, h))) out.dream = answer;
    if (!out.why && labels.why.some((l) => same(l, h))) out.why = answer;
  }
  return out;
}

export async function getFounderWords(projectId: string, description: string | null): Promise<FounderWords> {
  const [sv, en, dream] = await Promise.all([
    getTranslations({ locale: "sv", namespace: "DreamGuide" }),
    getTranslations({ locale: "en", namespace: "DreamGuide" }),
    prisma.dreamConversation.findUnique({ where: { projectId }, select: { roomId: true } }),
  ]);
  const both = (key: string) => [sv(key), en(key)];
  if (dream) {
    const messages = await prisma.message.findMany({
      where: { roomId: dream.roomId },
      orderBy: { createdAt: "asc" },
      select: { body: true, isAi: true },
      take: 40,
    });
    const words = founderWordsFromMessages(messages, {
      dream: both("questions.dream.title"),
      why: both("questions.why_you.title"),
      unknown: both("unknownAnswer"),
    });
    if (words.dream || words.why) return words;
  }
  if (description?.includes("<h3")) {
    return founderWordsFromDescription(description, { dream: both("questions.dream.area"), why: both("questions.why_you.area") });
  }
  return { dream: null, why: null };
}
