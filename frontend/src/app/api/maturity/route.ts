import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { calculateMaturityScore } from "@/lib/projectMaturity";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectSlug } = body as { projectSlug?: string };
  if (!projectSlug) {
    return NextResponse.json({ error: "projectSlug required" }, { status: 400 });
  }

  const score = await calculateMaturityScore(projectSlug);

  const existing = await prisma.projectMaturity.findUnique({ where: { projectSlug } });

  let scalingPlan: string | null = existing?.scalingPlan ?? null;

  if (score >= 70 && !scalingPlan) {
    const client = new Anthropic();
    try {
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system:
          "Du är en erfaren skalningsexpert för sociala projekt. Skriv ett konkret och inspirerande skalningsplan på svenska. Använd markdown-formatering.",
        messages: [
          {
            role: "user",
            content:
              `Projektet "${projectSlug}" har uppnått en mognadspoäng på ${score}/100 och är redo att skalas. ` +
              "Skriv en detaljerad skalningsplan (ca 400-600 ord) som täcker: " +
              "1) Hur projektet kan replikeras i nya regioner/sammanhang, " +
              "2) Vilka resurser och kompetenser som behövs, " +
              "3) Kritiska framgångsfaktorer, " +
              "4) Förslag på nästa konkreta steg.",
          },
        ],
      });
      const text =
        response.content[0].type === "text" ? response.content[0].text : null;
      if (text) {
        scalingPlan = text;
        await prisma.projectMaturity.update({
          where: { projectSlug },
          data: { scalingPlan: text, scaleInitiatedAt: new Date() },
        });
      }
    } catch {
      // AI plan generation failed — continue without it
    }
  }

  return NextResponse.json({ score, scalingPlan });
}
