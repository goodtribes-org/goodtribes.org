import Anthropic from "@anthropic-ai/sdk";

export async function estimateTask(
  title: string,
  description: string | null,
): Promise<{ hours: number; confidence: "low" | "medium" | "high"; reasoning: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system:
        'Du är en erfaren projektledare. Analysera följande arbetsuppgift och uppskatta hur många timmar den tar att slutföra för en kompetent person. Returnera ENBART giltig JSON utan markdown-formatering: { "hours": number, "confidence": "low|medium|high", "reasoning": string }',
      messages: [
        {
          role: "user",
          content:
            "Uppgift: " +
            title +
            (description ? "\n\nBeskrivning: " + description : ""),
        },
      ],
    });
    const text =
      response.content[0].type === "text" ? response.content[0].text : null;
    if (!text) return null;
    const parsed = JSON.parse(text.trim());
    if (
      typeof parsed.hours !== "number" ||
      !["low", "medium", "high"].includes(parsed.confidence) ||
      typeof parsed.reasoning !== "string"
    ) {
      return null;
    }
    return {
      hours: parsed.hours,
      confidence: parsed.confidence as "low" | "medium" | "high",
      reasoning: parsed.reasoning,
    };
  } catch {
    return null;
  }
}
