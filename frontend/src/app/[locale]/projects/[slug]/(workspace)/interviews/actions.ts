"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isRealMember } from "@/lib/authz";

export async function addInterviewLogEntry(
  projectSlug: string,
  data: { date: string; personaName: string; painPoint: string; validated: boolean; quotes: string }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const personaName = data.personaName.trim();
  const painPoint = data.painPoint.trim();
  if (!personaName || !painPoint || !data.date) return { error: "Missing required fields" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Project not found" };
  if (!(await isRealMember(project.id, session.user.id))) return { error: "Not a project member" };

  const entry = await prisma.interviewLogEntry.create({
    data: {
      projectSlug,
      date: new Date(data.date),
      personaName,
      painPoint,
      validated: data.validated,
      quotes: data.quotes.trim() || null,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  revalidatePath(`/projects/${projectSlug}/interviews`);
  return { entry };
}

export async function deleteInterviewLogEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const entry = await prisma.interviewLogEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "Entry not found" };
  if (entry.createdById !== session.user.id) return { error: "Not authorized" };

  await prisma.interviewLogEntry.delete({ where: { id: entryId } });
  revalidatePath(`/projects/${entry.projectSlug}/interviews`);
  return { ok: true };
}
