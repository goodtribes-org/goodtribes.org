import { unstable_cache, revalidateTag } from "next/cache";
import type { FeatureFlagState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSiteAdmin } from "@/lib/authz";

// Every flag the app knows about. Adding a flag is a code change (so it's
// reviewed and has a description); turning it on is a data change done from
// /site-admin/feature-flags. A flag with no FeatureFlag row is OFF.
export const FEATURE_FLAGS = {
  "ai-project-start": {
    label: "AI-guidad projektstart",
    description:
      "Vägval (AI gör / AI hjälper / manuellt) och Drömsamtalet när ett nytt projekt skapas, i stället för att gå direkt till Snabbstart.",
    // The AI parts stay hidden until ANTHROPIC_API_KEY is configured (see
    // lib/aiProjectStart.ts); the admin page warns about it.
    requiresAi: true,
  },
} as const satisfies Record<string, { label: string; description: string; requiresAi?: boolean }>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isKnownFeatureFlag(key: string): key is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, key);
}

export const FEATURE_FLAGS_TAG = "feature-flags";

// Pure evaluation, split out so it can be unit tested without a database.
export function evaluateFeatureFlag(state: FeatureFlagState, userIsSiteAdmin: boolean): boolean {
  if (state === "ON") return true;
  if (state === "ADMINS_ONLY") return userIsSiteAdmin;
  return false;
}

// All flag states in one cached query — flags are read on hot paths (page
// renders), change rarely, and are invalidated explicitly by setFeatureFlag.
// The 30s revalidate is only a safety net for multiple pods, where a tag
// invalidation on one pod doesn't reach the others' in-memory cache.
export const getFeatureFlagStates = unstable_cache(
  async (): Promise<Record<string, FeatureFlagState>> => {
    const rows = await prisma.featureFlag.findMany({ select: { key: true, state: true } });
    return Object.fromEntries(rows.map((r) => [r.key, r.state]));
  },
  ["feature-flag-states"],
  { revalidate: 30, tags: [FEATURE_FLAGS_TAG] },
);

export async function getFeatureFlagState(key: FeatureFlagKey): Promise<FeatureFlagState> {
  const states = await getFeatureFlagStates();
  return states[key] ?? "OFF";
}

// userId is optional: logged-out visitors only ever see flags that are ON.
// The site-admin lookup only happens for ADMINS_ONLY flags, so the common
// OFF/ON case costs a single cached read.
export async function isFeatureEnabled(key: FeatureFlagKey, userId?: string | null): Promise<boolean> {
  const state = await getFeatureFlagState(key);
  if (state !== "ADMINS_ONLY") return evaluateFeatureFlag(state, false);
  return evaluateFeatureFlag(state, userId ? await isSiteAdmin(userId) : false);
}

export async function setFeatureFlagState(key: FeatureFlagKey, state: FeatureFlagState, updatedById: string) {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, state, updatedById },
    update: { state, updatedById },
  });
  revalidateTag(FEATURE_FLAGS_TAG, "max");
}
