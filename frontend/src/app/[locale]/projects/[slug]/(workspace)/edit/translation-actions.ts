"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { indexDocuments } from "@/lib/meili";
import { requireProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { routing } from "@/i18n/routing";
import { getAnthropicClient, checkAiRateLimit } from "@/lib/anthropic";

export type TranslationDraft = { title: string; summary: string | null; description: string | null };

// AI-drafts an English translation of a project's current (Swedish) title/
// summary/description for the founder to review and edit before saving —
// this never writes anything itself, it only hands back a draft for
// upsertProjectTranslation to persist once approved. Reads the project's
// own stored content rather than trusting arbitrary client-submitted text.
export async function suggestProjectTranslation(
  projectId: string
): Promise<{ error: string } | { ok: true; draft: TranslationDraft }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, slug: true, title: true, summary: true, description: true },
  });
  if (!project) return { error: "Not found" };

  try {
    await requireProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES);
  } catch {
    return { error: "Not authorised" };
  }

  const client = await getAnthropicClient();
  if (!client) return { error: "AI-funktioner är inte tillgängliga just nu." };
  if (!(await checkAiRateLimit(session.user.id))) {
    return { error: "Du har nått gränsen för AI-anrop denna timme — försök igen senare." };
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system:
        "Du översätter innehåll för en ideell plattform (GoodTribes) från svenska till naturlig, idiomatisk engelska. " +
        "Bevara ton och betydelse — översätt inte ordagrant. Behåll eventuell HTML-formatering i beskrivningen oförändrad " +
        "(översätt bara texten inuti taggarna). Returnera ENBART giltig JSON utan markdown-formatering: " +
        '{ "title": string, "summary": string | null, "description": string | null }',
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            title: project.title,
            summary: project.summary,
            description: project.description,
          }),
        },
      ],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : null;
    if (!text) return { error: "Kunde inte generera ett förslag — försök igen." };
    const parsed = JSON.parse(text.trim());
    if (typeof parsed.title !== "string" || !parsed.title.trim()) {
      return { error: "Kunde inte generera ett förslag — försök igen." };
    }
    return {
      ok: true,
      draft: {
        title: parsed.title,
        summary: typeof parsed.summary === "string" ? parsed.summary : null,
        description: typeof parsed.description === "string" ? parsed.description : null,
      },
    };
  } catch {
    return { error: "Kunde inte generera ett förslag — försök igen." };
  }
}

// Saves (or updates) a non-default-locale translation for a project's
// title/summary/description. The base sv columns on Project are never
// touched here — same permission level as updateProject (project lead,
// site-admin bypass via requireProjectRole's default). No UI calls this yet;
// it's the plumbing an AI-draft-then-approve flow will call into.
export async function upsertProjectTranslation(
  projectId: string,
  locale: string,
  data: { title: string; summary: string | null; description: string | null }
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (locale === routing.defaultLocale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { error: "Invalid locale" };
  }

  const title = data.title.trim();
  if (!title) return { error: "Title is required" };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Not found" };

  try {
    await requireProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES);
  } catch {
    return { error: "Not authorised" };
  }

  await prisma.projectTranslation.upsert({
    where: { projectId_locale: { projectId, locale } },
    create: {
      projectId,
      locale,
      title,
      summary: data.summary?.trim() || null,
      description: data.description?.trim() || null,
    },
    update: {
      title,
      summary: data.summary?.trim() || null,
      description: data.description?.trim() || null,
    },
  });

  if (locale === "en" && !project.hiddenAt) {
    void indexDocuments("projects", [{
      id: `project-${project.slug}__en`,
      type: "project",
      title,
      description: data.description?.trim() || "",
      url: `/projects/${project.slug}`,
      phase: project.phase,
      sdgGoals: project.sdgGoals,
      locale: "en",
    }]);
  }

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${project.slug}/edit`);
  return { ok: true };
}
