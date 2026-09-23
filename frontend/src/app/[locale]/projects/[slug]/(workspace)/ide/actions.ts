"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { buildTranscript, runIdeaFill, type FillSection } from "@/lib/ideaFill";

const RETRYABLE: readonly FillSection[] = ["leanCanvas", "valueProposition", "marketScan", "interviewGuide"];

// "Försök igen" for a section the AI couldn't fill (failed, or cut short).
// Same background fill as after the conversation, for just that section.
export async function retryIdeaFillSection(projectSlug: string, section: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!RETRYABLE.includes(section as FillSection)) throw new Error("Okänd sektion");
  if (!(await isAiProjectStartAvailable(session.user.id))) throw new Error("AI är inte tillgänglig just nu");

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, slug: true, dreamConversation: { select: { id: true, roomId: true, aiMode: true } } },
  });
  if (!project?.dreamConversation) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  const dream = project.dreamConversation;
  await prisma.$executeRaw`
    UPDATE "DreamConversation"
    SET "fillStatus" = COALESCE("fillStatus", '{}'::jsonb) || jsonb_build_object(${section}::text, 'pending'::text),
        "updatedAt" = NOW()
    WHERE id = ${dream.id}`;
  const transcript = await buildTranscript(dream.roomId);
  void runIdeaFill({
    dreamId: dream.id,
    projectId: project.id,
    projectSlug: project.slug,
    mode: dream.aiMode,
    transcript,
    userId: session.user.id,
    only: [section as FillSection],
  });
  revalidatePath(`/projects/${projectSlug}/ide`);
}
