import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk";


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
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

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
      project: { select: { title: true, description: true } },
      estimate: true,
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

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

    const client = new Anthropic();
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
