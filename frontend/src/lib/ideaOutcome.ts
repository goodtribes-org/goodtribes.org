import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

// "Det här blev av idén" (#237): the author of a shared idea hears what
// becomes of it — a project starting (linkProjectToIdea), moving to a new
// phase, or getting a delivered result verified. Never the project's own
// owner (they know), and never for a hidden idea. Best-effort: a missed
// notice must not fail the action that triggered it.
export async function notifyIdeaAuthor(
  projectId: string,
  notice: { type: string; title: (project: string, idea: string) => string; body?: string; url?: (slug: string) => string },
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true, title: true, ownerId: true, basedOnIdea: { select: { id: true, title: true, authorId: true, hiddenAt: true } } },
    });
    const idea = project?.basedOnIdea;
    if (!project || !idea || idea.hiddenAt || idea.authorId === project.ownerId) return;
    await createNotification({
      userId: idea.authorId,
      type: notice.type,
      title: notice.title(project.title, idea.title),
      body: notice.body,
      url: notice.url ? notice.url(project.slug) : `/ideas/${idea.id}`,
    });
  } catch {
    // best-effort, see above
  }
}
