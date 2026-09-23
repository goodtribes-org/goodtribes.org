import { getAiClientFor } from "@/lib/aiMode";

// SDG suggestions for a free-text description (idea feed, project creation,
// project edit). Goes through the AI gate like every other call: rate-limited
// per user, and when projectId is given, blocked by a MANUAL project.
export async function suggestSdgGoals(
  text: string,
  userId: string,
  projectId: string | null = null,
): Promise<{ goals: number[]; reasoning: string } | null> {
  if (text.trim().length < 20) return null;

  const gate = await getAiClientFor({ feature: "sdg-suggestion", kind: "assist", userId, projectId });
  if (!gate.ok) return null;

  try {
    const response = await gate.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You are an expert on the UN Agenda 2030 Sustainable Development Goals.
Analyze the text and return ONLY valid JSON (no markdown, no explanation):
{"suggested_sdgs": [array of 1-5 SDG numbers most relevant, sorted by relevance], "reasoning": "one sentence"}
SDG numbers are 1-17.`,
      messages: [{ role: "user", content: text }],
    });

    const raw = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(raw) as { suggested_sdgs: number[]; reasoning: string };

    return {
      goals: (parsed.suggested_sdgs ?? [])
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 17)
        .slice(0, 5),
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return null;
  }
}
