"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { createWikiPage } from "@/lib/phaseFill";
import { isPhaseWikiSlug, phaseWikiTemplate } from "@/lib/phaseWikiTemplates";

// "Skriv själv" (#311): a lead starts Lansering's "Arbetsflöden och ansvar"
// or Etablera's playbook from a template, without AI, and lands on the wiki
// page to write it. A page that already exists is just opened.
export async function startPhaseWikiPage(projectSlug: string, wikiSlug: string): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !isPhaseWikiSlug(wikiSlug)) return;
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project || !(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) return;

  const locale = await getLocale();
  const exists = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug, slug: wikiSlug } }, select: { id: true } });
  if (!exists) {
    const { title, html } = phaseWikiTemplate(wikiSlug, locale);
    await createWikiPage(projectSlug, wikiSlug, title, html, userId);
  }
  redirect(`/${locale}/projects/${projectSlug}/wiki/${wikiSlug}`);
}
