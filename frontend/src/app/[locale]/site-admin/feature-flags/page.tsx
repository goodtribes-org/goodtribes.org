import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import type { FeatureFlagState } from "@prisma/client";
import type { Locale } from "next-intl";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/featureFlags";
import { updateFeatureFlag } from "./actions";

const STATES: FeatureFlagState[] = ["OFF", "ADMINS_ONLY", "ON"];

export default async function FeatureFlagsAdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [rows, t] = await Promise.all([
    // Read uncached: an admin who just flipped a flag must see the new state.
    prisma.featureFlag.findMany(),
    getTranslations({ locale, namespace: "FeatureFlagsAdminPage" }),
  ]);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const stateLabel: Record<FeatureFlagState, string> = {
    OFF: t("stateOff"),
    ADMINS_ONLY: t("stateAdminsOnly"),
    ON: t("stateOn"),
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">{t("intro")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {(Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]).map((key) => {
          const flag = FEATURE_FLAGS[key];
          const row = byKey.get(key);
          const current = row?.state ?? "OFF";
          return (
            <div key={key} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-dark-slate">{flag.label}</p>
                  <p className="text-xs font-mono text-dark-slate/40 mt-0.5">{key}</p>
                  <p className="text-sm text-dark-slate/70 mt-2">{flag.description}</p>
                  {row && (
                    <p className="text-xs text-dark-slate/40 mt-2">
                      {t("lastChanged", { date: row.updatedAt.toLocaleString(locale === "sv" ? "sv-SE" : "en-GB") })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 rounded-lg border border-muted-teal/50 overflow-hidden text-xs font-medium">
                  {STATES.map((state) => (
                    <form
                      key={state}
                      action={async () => {
                        "use server";
                        await updateFeatureFlag(key, state);
                      }}
                    >
                      <button
                        type="submit"
                        disabled={state === current}
                        aria-pressed={state === current}
                        className={`px-3 py-2 transition-colors ${
                          state === current
                            ? state === "ON"
                              ? "bg-seagrass text-white"
                              : state === "ADMINS_ONLY"
                                ? "bg-coral text-white"
                                : "bg-dark-slate/80 text-white"
                            : "bg-white text-dark-slate/60 hover:text-dark-slate hover:bg-dry-sage/20"
                        }`}
                      >
                        {stateLabel[state]}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
