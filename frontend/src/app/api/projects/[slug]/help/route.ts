import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isRealMember } from "@/lib/authz";
import { getProjectJourney } from "@/lib/projectJourney";
import { toDisplayPhase } from "@/lib/projectPhase";

// Feeds the help panel inside a project: the project's phase and — for
// members, same as the "Nästa steg" line under the phase bars — the next
// step with a link to where it's done. The phase is public (it's on the
// project page for anyone).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, slug: true, phase: true } });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const session = await auth();
  const member = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;
  const journey = member ? await getProjectJourney(project) : null;

  return NextResponse.json({
    phase: toDisplayPhase(project.phase),
    nextStepKey: journey?.nextStepKey ?? null,
    nextStepHref: journey?.nextStepHref ?? null,
  });
}
