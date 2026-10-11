"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notify";
import { PROJECT_LEAD_ROLES } from "@/lib/authz";
import { asksForInterest, normalizePlace } from "@/lib/interest";

// "Jag vill att det här startar där jag bor" (#332). Anyone may say so,
// logged in or not — limited per address against spam, with a honeypot
// field bots fill in. Someone who wants to help start it may leave a name
// and a way to be reached; only the project's leads see those, and they're
// told when it happens.
export async function addInterest(
  projectSlug: string,
  input: { place: string; wantsToHelp: boolean; name: string; contact: string; website: string },
): Promise<{ error?: string }> {
  if (input.website) return {}; // honeypot: look fine, save nothing
  const place = normalizePlace(input.place);
  if (place.length < 2) return { error: "Skriv var du bor" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`interest:${ip}`, 5, 3600))) return { error: "Du har redan visat intresse flera gånger — tack!" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, title: true, publishedAt: true, openForReplication: true, phase: true, hiddenAt: true } });
  if (!project || project.hiddenAt || !asksForInterest(project)) return { error: "Projektet tar inte emot intresse just nu" };
  const session = await auth();
  const name = input.wantsToHelp ? input.name.trim().slice(0, 80) || null : null;
  const contact = input.wantsToHelp ? input.contact.trim().slice(0, 200) || null : null;
  await prisma.interestSignal.create({
    data: { projectId: project.id, place, wantsToHelp: input.wantsToHelp, name, contact, userId: session?.user?.id ?? null },
  });
  if (input.wantsToHelp) {
    const leads = await prisma.projectMember.findMany({ where: { projectId: project.id, role: { in: [...PROJECT_LEAD_ROLES] } }, select: { userId: true } });
    for (const l of leads) {
      await createNotification({
        userId: l.userId,
        type: "interest_helper",
        title: `Någon vill starta ${project.title} i ${place}`,
        body: name ? `${name} vill hjälpa till att starta det där.` : "En person vill hjälpa till att starta det där.",
        url: `/projects/${projectSlug}/skala?step=scaling_goals_set`,
      });
    }
  }
  revalidatePath(`/projects/${projectSlug}`);
  return {};
}
