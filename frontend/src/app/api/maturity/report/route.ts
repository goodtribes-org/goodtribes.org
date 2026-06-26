import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectSlug } = await req.json() as { projectSlug: string };
  if (!projectSlug) {
    return NextResponse.json({ error: "projectSlug required" }, { status: 400 });
  }

  const projectForAuth = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  const membership = projectForAuth
    ? await prisma.projectMember.findFirst({
        where: { projectId: projectForAuth.id, userId: session.user.id, role: { in: ["owner", "admin"] } },
      })
    : null;
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    include: {
      alumni: { select: { id: true } },
      impactMetrics: { select: { label: true, unit: true, currentValue: true } },
      maturity: { select: { score: true } },
      _count: { select: { members: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const alumniCount = project.alumni.length;
  const score = project.maturity?.score ?? 0;
  const impactSummary = project.impactMetrics.length > 0
    ? project.impactMetrics
        .map((m) => `${m.currentValue} ${m.unit} ${m.label}`)
        .join(", ")
    : "Inga mätvärden registrerade";

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: "Du är en expert på att skriva sammanfattningar av samhällsprojekt på svenska.",
    messages: [
      {
        role: "user",
        content: `Skriv en slutrapport på svenska för projektet "${project.title}".
Beskrivning: ${project.description ?? "Ej angiven"}
Antal bidragsgivare: ${alumniCount}
Mognadsbedömning: ${score}/100
Impact-mätvärden: ${impactSummary}

Inkludera: vad projektet åstadkommit, viktigaste lärdomar, och ett uppmuntrande avslut.
Max 400 ord. Använd markdown-rubriker (##).`,
      },
    ],
  });

  const report =
    message.content[0].type === "text" ? message.content[0].text : "";

  await prisma.projectMaturity.upsert({
    where: { projectSlug },
    create: { projectSlug, finalReport: report },
    update: { finalReport: report },
  });

  return NextResponse.json({ report });
}
