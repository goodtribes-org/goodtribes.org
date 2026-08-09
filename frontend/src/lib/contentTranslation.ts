import type { Locale } from "next-intl";
import { routing } from "@/i18n/routing";

// Same fallback idiom as getSitePage() in sitePages.ts: prefer a translated
// row for the requested locale, else fall back to the base (sv) columns —
// which stay canonical and are never removed. Callers pass an already
// Prisma-`include`d `translations` array; no extra query happens here.

interface ProjectBase {
  title: string;
  summary: string | null;
  description: string | null;
}
interface ProjectTranslationRow {
  locale: string;
  title: string;
  summary: string | null;
  description: string | null;
}

export function resolveProjectContent<T extends ProjectBase>(
  project: T,
  translations: ProjectTranslationRow[] | undefined | false,
  locale: Locale
): ProjectBase {
  if (locale === routing.defaultLocale || !translations || translations.length === 0) {
    return { title: project.title, summary: project.summary, description: project.description };
  }
  const t = translations.find((t: ProjectTranslationRow) => t.locale === locale);
  return t
    ? { title: t.title, summary: t.summary, description: t.description }
    : { title: project.title, summary: project.summary, description: project.description };
}

interface IdeaBase {
  title: string;
  description: string | null;
  problem: string | null;
  solution: string | null;
}
interface IdeaTranslationRow {
  locale: string;
  title: string;
  description: string | null;
  problem: string | null;
  solution: string | null;
}

export function resolveIdeaContent<T extends IdeaBase>(
  idea: T,
  translations: IdeaTranslationRow[] | undefined | false,
  locale: Locale
): IdeaBase {
  if (locale === routing.defaultLocale || !translations || translations.length === 0) {
    return { title: idea.title, description: idea.description, problem: idea.problem, solution: idea.solution };
  }
  const t = translations.find((t: IdeaTranslationRow) => t.locale === locale);
  return t
    ? { title: t.title, description: t.description, problem: t.problem, solution: t.solution }
    : { title: idea.title, description: idea.description, problem: idea.problem, solution: idea.solution };
}
