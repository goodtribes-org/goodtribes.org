"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setToolAiMode } from "@/lib/actions/aiPreferences";
import { AI_TOOL_KEYS, type AiToolKey } from "@/lib/aiToolKeys";
import type { AiMode, AiAgentScope } from "@prisma/client";

export default function ToolAiPreferencesPanel({
  projectSlug,
  preferences,
  canEdit,
}: {
  projectSlug: string;
  preferences: Record<AiToolKey, { aiMode: AiMode; agentScope: AiAgentScope }>;
  canEdit: boolean;
}) {
  const t = useTranslations("AIReviewPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(toolKey: AiToolKey, aiMode: AiMode, agentScope: AiAgentScope) {
    startTransition(async () => {
      await setToolAiMode(projectSlug, toolKey, aiMode, agentScope);
      router.refresh();
    });
  }

  return (
    <div className="mt-10 border-t border-muted-teal/20 pt-6">
      <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-1">
        {t("toolPreferencesHeading")}
      </h2>
      <p className="text-xs text-dark-slate/40 mb-4">{t("toolPreferencesHelp")}</p>

      <div className="flex flex-col gap-2">
        {AI_TOOL_KEYS.map(({ key, labelKey }) => {
          const pref = preferences[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 border border-muted-teal/30 rounded-lg px-4 py-2.5"
            >
              <span className="text-sm text-dark-slate">{t(`toolKey_${labelKey}`)}</span>
              {canEdit ? (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={pref.aiMode}
                    disabled={isPending}
                    onChange={(e) => update(key, e.target.value as AiMode, pref.agentScope)}
                    className="text-xs border border-muted-teal/60 rounded-md px-2 py-1 bg-white text-dark-slate disabled:opacity-50"
                  >
                    <option value="MANUAL">{t("aiModeManual")}</option>
                    <option value="AGENT">{t("aiModeAgent")}</option>
                  </select>
                  {pref.aiMode === "AGENT" && (
                    <select
                      value={pref.agentScope}
                      disabled={isPending}
                      onChange={(e) => update(key, pref.aiMode, e.target.value as AiAgentScope)}
                      className="text-xs border border-muted-teal/60 rounded-md px-2 py-1 bg-white text-dark-slate disabled:opacity-50"
                    >
                      <option value="TASK">{t("agentScopeTask")}</option>
                      <option value="PHASE">{t("agentScopePhase")}</option>
                      <option value="ALL">{t("agentScopeAll")}</option>
                    </select>
                  )}
                </div>
              ) : (
                <span className="text-xs text-dark-slate/40 shrink-0">
                  {pref.aiMode === "AGENT" ? t("aiModeAgent") : t("aiModeManual")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
