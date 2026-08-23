import { getAnthropicClient, checkAiRateLimit } from "@/lib/anthropic";

// userId rate-limits like every other AI call site (see checkAiRateLimit) —
// this runs on every kanban card creation, not behind a dedicated "ask AI"
// button, so a very active team could otherwise rack up one Anthropic call
// per task with no cap at all. Rate-limited out means "no estimate this
// time", same graceful degradation as AI being unconfigured — never blocks
// the card from being created.
export async function estimateTask(
  title: string,
  description: string | null,
  userId: string,
): Promise<{ hours: number; confidence: "low" | "medium" | "high"; reasoning: string } | null> {
  const client = await getAnthropicClient();
  if (!client) return null;
  if (!(await checkAiRateLimit(userId))) return null;
  try {
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
