import { isAiEnabled } from "@/lib/anthropic";
import { isFeatureEnabled } from "@/lib/featureFlags";

// The AI-guided project start (vägval, Drömsamtalet, AI mode settings,
// "Prata med AI:n", canvas review) needs BOTH the ai-project-start flag
// and a configured Anthropic key. Without a key those parts are hidden
// entirely — "Nytt projekt" goes straight to Snabbstart — instead of
// leading users into a conversation that can't answer. So the flag can be
// switched on before the key exists, and everything appears by itself once
// ANTHROPIC_API_KEY is added.
//
// Parts that don't call AI (vet/antar marking, pending suggestions, the SDG
// recommendation) only need the flag and use isFeatureEnabled directly.
export async function isAiProjectStartAvailable(userId: string | null | undefined): Promise<boolean> {
  if (!isAiEnabled()) return false;
  return isFeatureEnabled("ai-project-start", userId);
}
