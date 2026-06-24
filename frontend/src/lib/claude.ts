const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

export async function suggestSdgGoals(
  text: string
): Promise<{ goals: number[]; reasoning: string } | null> {
  if (!ANTHROPIC_API_KEY || text.trim().length < 20) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: `You are an expert on the UN Agenda 2030 Sustainable Development Goals.
Analyze the text and return ONLY valid JSON (no markdown, no explanation):
{"suggested_sdgs": [array of 1-5 SDG numbers most relevant, sorted by relevance], "reasoning": "one sentence"}
SDG numbers are 1-17.`,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      content?: { type: string; text: string }[];
    };

    const raw = data.content?.find((b) => b.type === "text")?.text ?? "";
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
