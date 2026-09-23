"use server";

import { revalidatePath } from "next/cache";
import type { FeatureFlagState } from "@prisma/client";
import { requireAdminSession } from "@/lib/authz";
import { isKnownFeatureFlag, setFeatureFlagState } from "@/lib/featureFlags";

const STATES: FeatureFlagState[] = ["OFF", "ADMINS_ONLY", "ON"];

export async function updateFeatureFlag(key: string, state: string) {
  const adminId = await requireAdminSession();
  if (!isKnownFeatureFlag(key)) throw new Error("Okänd flagga");
  if (!STATES.includes(state as FeatureFlagState)) throw new Error("Ogiltigt läge");

  await setFeatureFlagState(key, state as FeatureFlagState, adminId);
  revalidatePath("/site-admin/feature-flags");
}
