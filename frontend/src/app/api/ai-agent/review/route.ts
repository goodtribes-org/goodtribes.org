import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const prisma = new PrismaClient();

function buildSystemPrompt(projectTitle: string, projectDescription: string | null, agentType: string): string {
  const base = `Du är en professionell projektmedlem i projektet '${projectTitle}'.
Projektbeskrivning: ${projectDescription ?? "Ej angiven"}
Leverera alltid ett strukturerat svar i markdown-format.`;

  const typeAddition: Record<string, string> = {
    writer: "Du är en professionell skribent. Skriv tydlig, engagerande text.",
    analyst: "Du är en analytiker. Analysera noggrant och presentera slutsatser strukturerat.",
    researcher: "Du är en researcher. Sammanfatta relevant information tydligt med källhänvisningar där möjligt.",
  };

  const addition = typeAddition[agentType] ?? "";
  return addition ? `${base}\n${addition}` : base;
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
  const { aiTaskRunId, decision, feedback } = body as {
    aiTaskRunId: string;
    decision: "approved" | "revision" | "rejected";
    feedback?: string;
  };

  const aiTaskRun = await prisma.aiTaskRun.findUnique({
    where: { id: aiTaskRunId },
    include: {
      kanbanCard: {
        include: {
          project: { select: { title: true, description: true, slug: true } },
          estimate: true,
        },
      },
      reviews: true,
    },
  });

  if (!aiTaskRun) {
    return NextResponse.json({ error: "AI task run not found" }, { status: 404 });
  }

  const revisionCount = aiTaskRun.reviews.filter((r) => r.decision === "revision").length;

  // Escalate if revision limit reached
  const effectiveDecision =
    decision === "revision" && revisionCount >= 3 ? "escalated" : decision;

  if (effectiveDecision === "approved") {
    await prisma.aiTaskRun.update({
      where: { id: aiTaskRunId },
      data: { status: "approved" },
    });

    await prisma.aiTaskReview.create({
      data: {
        aiTaskRunId,
        reviewerId: session.user.id,
        decision: "approved",
        feedback: feedback ?? null,
      },
    });

    await prisma.kanbanCard.update({
      where: { id: aiTaskRun.kanbanCardId },
      data: { column: "DONE" },
    });

    // Award tokens: 20% of estimate.aiHours, minimum 0.5
    const estimatedHours = aiTaskRun.kanbanCard.estimate?.aiHours ?? 0;
    const tokensAwarded = Math.max(estimatedHours * 0.2, 0.5);

    await prisma.tokenLedger.create({
      data: {
        userId: session.user.id,
        projectSlug: aiTaskRun.kanbanCard.project.slug,
        kanbanCardId: aiTaskRun.kanbanCardId,
        tokens: tokensAwarded,
        reason: "AI task review: approved",
      },
    });

    return NextResponse.json({ success: true });
  }

  if (effectiveDecision === "escalated") {
    await prisma.aiTaskRun.update({
      where: { id: aiTaskRunId },
      data: { status: "escalated" },
    });

    await prisma.aiTaskReview.create({
      data: {
        aiTaskRunId,
        reviewerId: session.user.id,
        decision: "escalated",
        feedback: feedback ?? null,
      },
    });

    return NextResponse.json({ success: true, escalated: true });
  }

  if (decision === "revision") {
    const newAttemptNumber = aiTaskRun.attemptNumber + 1;

    const newRun = await prisma.aiTaskRun.create({
      data: {
        kanbanCardId: aiTaskRun.kanbanCardId,
        agentType: aiTaskRun.agentType,
        status: "running",
        attemptNumber: newAttemptNumber,
        feedback: feedback ?? null,
      },
    });

    try {
      const card = aiTaskRun.kanbanCard;
      const systemPrompt = buildSystemPrompt(
        card.project.title,
        card.project.description,
        aiTaskRun.agentType,
      );
      const baseUserMessage = `Utför följande uppgift:\n\n**${card.title}**\n\n${card.description ?? ""}`;
      const userMessage = feedback
        ? `${baseUserMessage}\n\nPrevious attempt feedback: ${feedback}`
        : baseUserMessage;

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
        where: { id: newRun.id },
        data: {
          status: "awaiting_review",
          outputMarkdown,
          completedAt: new Date(),
        },
      });

      await prisma.kanbanCard.update({
        where: { id: aiTaskRun.kanbanCardId },
        data: { column: "REVIEW" },
      });

      await prisma.aiTaskReview.create({
        data: {
          aiTaskRunId,
          reviewerId: session.user.id,
          decision: "revision",
          feedback: feedback ?? null,
        },
      });

      return NextResponse.json({ success: true, newRunId: newRun.id });
    } catch {
      await prisma.aiTaskRun.update({
        where: { id: newRun.id },
        data: { status: "escalated" },
      });
      return NextResponse.json({ error: "AI revision failed" }, { status: 500 });
    }
  }

  if (decision === "rejected") {
    await prisma.aiTaskRun.update({
      where: { id: aiTaskRunId },
      data: { status: "rejected" },
    });

    await prisma.aiTaskReview.create({
      data: {
        aiTaskRunId,
        reviewerId: session.user.id,
        decision: "rejected",
        feedback: feedback ?? null,
      },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
}
