import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeRadialLayout, toReactFlowEdges, type RawMindMapNode, type RawMindMapEdge } from "@/lib/mindmapLayout";
import type { Prisma } from "@prisma/client";

function stripHtml(body: string): string {
  return body.replace(/<[^>]*>/g, "").trim();
}

const SYSTEM_PROMPT = `Du är en expert på att strukturera idéer och brainstorms till mindmaps.
Läs innehållet och svara ENBART med giltig JSON (ingen markdown, inga kodblock, ingen förklaringstext) på exakt denna form:
{"nodes": [{"id": "1", "label": "Central idé"}, {"id": "2", "label": "Gren A", "parentId": "1"}], "edges": [{"source": "1", "target": "2"}]}
Bygg en lätt trädstruktur: en rot-nod (ingen parentId) som fångar huvudtemat, och 5-12 grenar/undergrenar som fångar de viktigaste delidéerna, problemen och lösningarna som nämnts. Håll etiketterna korta (max ~6 ord).`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { source, sourceId } = (await req.json()) as { source?: "room" | "idea"; sourceId?: string };
  if (!source || !sourceId || (source !== "room" && source !== "idea")) {
    return NextResponse.json({ error: "source och sourceId krävs" }, { status: 400 });
  }

  let title: string;
  let contentText: string;

  if (source === "room") {
    const room = await prisma.room.findUnique({
      where: { id: sourceId },
      include: { participants: { where: { userId: session.user.id } } },
    });
    if (!room) return NextResponse.json({ error: "Tråden hittades inte" }, { status: 404 });
    if (room.participants.length === 0) {
      return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
    }

    const history = await prisma.message.findMany({
      where: { roomId: room.id, hiddenAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { name: true } } },
    });
    if (history.length === 0) {
      return NextResponse.json({ error: "Tråden har inga meddelanden än" }, { status: 400 });
    }

    title = room.name ?? "Idéverkstad";
    contentText = history.map((m) => `${m.author.name ?? "Någon"}: ${stripHtml(m.body)}`).join("\n");
  } else {
    const idea = await prisma.idea.findUnique({ where: { id: sourceId } });
    if (!idea) return NextResponse.json({ error: "Idén hittades inte" }, { status: 404 });
    if (idea.authorId !== session.user.id) {
      return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
    }

    title = idea.title;
    contentText = [
      `Titel: ${idea.title}`,
      idea.description ? `Beskrivning: ${idea.description}` : null,
      idea.problem ? `Problem: ${idea.problem}` : null,
      idea.solution ? `Lösning: ${idea.solution}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI ej konfigurerad" }, { status: 500 });
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contentText }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: { nodes: RawMindMapNode[]; edges: RawMindMapEdge[] };
  try {
    parsed = JSON.parse(raw.trim());
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error("shape");
  } catch {
    return NextResponse.json({ error: "Kunde inte tolka AI-svaret, försök igen" }, { status: 502 });
  }

  const nodes = computeRadialLayout(parsed.nodes);
  const edges = toReactFlowEdges(parsed.edges);
  const nodesJson = nodes as unknown as Prisma.InputJsonValue;
  const edgesJson = edges as unknown as Prisma.InputJsonValue;

  const mindMap = await prisma.mindMap.upsert({
    where: source === "room" ? { roomId: sourceId } : { ideaId: sourceId },
    create: {
      roomId: source === "room" ? sourceId : null,
      ideaId: source === "idea" ? sourceId : null,
      title,
      nodes: nodesJson,
      edges: edgesJson,
      createdById: session.user.id,
    },
    update: { nodes: nodesJson, edges: edgesJson },
  });

  return NextResponse.json({ id: mindMap.id, title: mindMap.title, nodes, edges });
}
