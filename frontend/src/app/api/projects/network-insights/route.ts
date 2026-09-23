import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getNetworkStats } from "@/lib/networkStats";
import { getAiClientFor, aiGateStatus } from "@/lib/aiMode";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parentSlug } = (await req.json()) as { parentSlug: string };
  if (!parentSlug) {
    return NextResponse.json({ error: "parentSlug required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { slug: parentSlug }, select: { id: true, title: true } });
  if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // An analysis the lead asked for — "assist".
  const gate = await getAiClientFor({ feature: "network-insights", kind: "assist", userId: session.user.id, projectId: project.id });
  if (!gate.ok) {
    const error =
      gate.reason === "rate_limited"
        ? "Too many AI requests — try again later"
        : gate.reason === "mode"
          ? "AI is turned off in this project's AI settings"
          : "AI not configured";
    return NextResponse.json({ error }, { status: aiGateStatus(gate.reason) });
  }
  const { client } = gate;

  const stats = await getNetworkStats(parentSlug);
  const instanceSummary = stats.instances
    .map(
      (i) =>
        `${i.title}${i.country ? ` (${i.country})` : ""}: ${i.contributors} bidragsgivare, ${Math.round(i.tokens)} tokens, ${i.tasksDone} avklarade uppgifter, ${i.fundsRaised} insamlat`
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: "Du är en expert på att analysera prestanda i globala projektnätverk på svenska.",
    messages: [
      {
        role: "user",
        content: `Analysera nätverket av instanser för projektet "${project.title}" (ursprungsprojektet listas först nedan).

${instanceSummary}

Identifiera vilken instans som presterar bäst och ge en hypotes om varför, baserat enbart på siffrorna ovan.
Ge också 1-2 konkreta förslag på vad de andra instanserna kan lära av den bäst presterande.
Max 300 ord. Använd markdown-rubriker (##).`,
      },
    ],
  });

  const insights = message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ insights });
}
