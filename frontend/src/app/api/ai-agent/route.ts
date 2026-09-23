import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { getAiClientFor, aiGateStatus, aiGateMessage } from "@/lib/aiMode";
import { isCardClaimant, isRealMember } from "@/lib/authz";
import { GITHUB_CARD_LOCKED_MESSAGE } from "@/lib/githubSync";


type AgentType = "writer" | "analyst" | "researcher";

function buildSystemPrompt(projectTitle: string, projectDescription: string | null, agentType: AgentType): string {
  const base = `Du är en professionell projektmedlem i projektet '${projectTitle}'.
Projektbeskrivning: ${projectDescription ?? "Ej angiven"}
Leverera alltid ett strukturerat svar i markdown-format.`;

  const typeAddition: Record<AgentType, string> = {
    writer: "Du är en professionell skribent. Skriv tydlig, engagerande text.",
    analyst: "Du är en analytiker. Analysera noggrant och presentera slutsatser strukturerat.",
    researcher: "Du är en researcher. Sammanfatta relevant information tydligt med källhänvisningar där möjligt.",
  };

  return `${base}\n${typeAddition[agentType]}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { kanbanCardId, agentType, additionalContext } = body as {
    kanbanCardId: string;
    agentType: AgentType;
    additionalContext?: string;
  };

  const card = await prisma.kanbanCard.findUnique({
    where: { id: kanbanCardId },
    include: {
      project: { select: { id: true, title: true, description: true } },
      estimate: true,
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  // The run ends by forcing the card into REVIEW, which the GitHub sync would
  // just undo — reject before spending a model call.
  if (card.source === "github") {
    return NextResponse.json({ error: GITHUB_CARD_LOCKED_MESSAGE }, { status: 403 });
  }

  // Same rule as moving the card (see kanbanMove.ts): a real project member,
  // or the non-member who claimed this open micro-task. Checked before any
  // AI call or DB write — a run spends the project's AI budget and moves
  // the card to REVIEW.
  const allowed = (await isRealMember(card.project.id, session.user.id)) || isCardClaimant(card, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // The agent performs the task itself — "agent" kind, AGENT mode only.
  const gate = await getAiClientFor({
    feature: "kanban-agent",
    kind: "agent",
    userId: session.user.id,
    projectId: card.project.id,
  });
  if (!gate.ok) {
    const error =
      gate.reason === "mode"
        ? "AI agent mode is turned off for this project"
        : gate.reason === "rate_limited"
          ? "Too many AI requests — try again later"
          : gate.reason === "budget_exceeded"
            ? aiGateMessage("budget_exceeded")
            : "AI not configured";
    return NextResponse.json({ error }, { status: aiGateStatus(gate.reason) });
  }
  const { client } = gate;

  const aiTaskRun = await prisma.aiTaskRun.create({
    data: {
      kanbanCardId,
      agentType,
      status: "running",
      attemptNumber: 1,
    },
  });

  try {
    const systemPrompt = buildSystemPrompt(card.project.title, card.project.description, agentType);
    const userMessage = `Utför följande uppgift:\n\n**${card.title}**\n\n${card.description ?? ""}\n\n${additionalContext ?? ""}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const outputMarkdown =
      message.content[0].type === "text" ? message.content[0].text : "";

    await prisma.aiTaskRun.update({
      where: { id: aiTaskRun.id },
      data: {
        status: "awaiting_review",
        outputMarkdown,
        completedAt: new Date(),
      },
    });

    await prisma.kanbanCard.update({
      where: { id: kanbanCardId },
      data: { column: "REVIEW" },
    });

    return NextResponse.json({ success: true, runId: aiTaskRun.id, output: outputMarkdown });
  } catch {
    await prisma.aiTaskRun.update({
      where: { id: aiTaskRun.id },
      data: { status: "escalated" },
    });
    return NextResponse.json({ error: "AI agent failed" }, { status: 500 });
  }
}
