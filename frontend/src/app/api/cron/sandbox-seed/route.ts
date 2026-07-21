import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { escapeHtml } from "@/lib/renderBody";

const SYSTEM_PROMPT = `Du är en kreativ idégenerator för GoodTribes, en plattform som kopplar
volontärer och organisationer till projekt som bidrar till FN:s Agenda 2030.
Hitta på 3 fristående, konkreta problemställningar som skulle kunna bli riktiga volontärprojekt.
Variera SDG-koppling, geografi och skala mellan förslagen.
Svara ENDAST med giltig JSON, ingen markdown, i exakt denna form:
{"threads":[{"title":"kort rubrik, max 60 tecken","problemStatement":"2-4 meningar som beskriver problemet","sdgGoals":[nummer 1-17]}]}`;

// Called daily by an external scheduler (GitHub Actions cron, see
// .github/workflows/sandbox-seed.yml). Requires the same
// Authorization: Bearer <CRON_SECRET> header as /api/cron/digest.
//
// Sandlådan (Utvecklingsfas 1.2): proactively seeds new AI-generated
// problem statements so the zone never feels empty (solves cold start, see
// 4e) — reuses the same Room/Message shape as Idéverkstaden, just flagged
// isSandbox/origin=AI_SEED, and the same AI participant User row
// (getAiParticipantUser) Idéverkstaden's @AI replies already use.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, seeded: 0, note: "AI ej konfigurerad" });
  }

  let threads: { title: string; problemStatement: string; sdgGoals: number[] }[] = [];
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Generera dagens 3 problemställningar." }],
    });
    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(raw.trim());
    threads = Array.isArray(parsed.threads) ? parsed.threads : [];
  } catch {
    return NextResponse.json({ ok: false, seeded: 0, error: "AI-anrop misslyckades" }, { status: 502 });
  }

  const aiUser = await getAiParticipantUser();
  let seeded = 0;

  for (const t of threads) {
    if (!t.title || !t.problemStatement) continue;
    const room = await prisma.room.create({
      data: {
        type: "IDEA_THREAD",
        name: t.title.slice(0, 80),
        isSandbox: true,
        origin: "AI_SEED",
      },
    });
    await prisma.message.create({
      data: {
        roomId: room.id,
        authorId: aiUser.id,
        body: `<p>${escapeHtml(t.problemStatement)}</p>`,
        isAi: true,
      },
    });
    seeded++;
  }

  return NextResponse.json({ ok: true, seeded });
}
