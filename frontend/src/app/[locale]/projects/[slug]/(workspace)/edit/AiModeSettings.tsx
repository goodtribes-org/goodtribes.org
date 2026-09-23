"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { AiMode } from "@prisma/client";
import AiModePicker from "@/components/ai/AiModePicker";
import { DISPLAY_PHASES } from "@/lib/projectPhase";
import type { DisplayPhase, ProjectAiSettings } from "@/lib/aiMode";
import { setAiProjectManager, setPhaseAiMode, setProjectAiMode } from "@/lib/actions/aiModeSettings";

const MODES: AiMode[] = ["AGENT", "ASSIST", "MANUAL"];
const INTRO_DISMISSED_KEY = "aiModeIntroDismissed";

const MODE_KEYS: Record<AiMode, { label: string; desc: string }> = {
  AGENT: { label: "labelAgent", desc: "descAgent" },
  ASSIST: { label: "labelAssist", desc: "descAssist" },
  MANUAL: { label: "labelManual", desc: "descManual" },
};

// Project-level AI settings on the project's edit page: the project's mode,
// optional per-phase overrides, and the AI project manager switch. Each
// change saves immediately (optimistic), like the checklist toggles above.
export default function AiModeSettings({ slug, initial }: { slug: string; initial: ProjectAiSettings }) {
  const t = useTranslations("AiMode");
  const tPhase = useTranslations("ProjectPhase");
  const [projectMode, setProjectModeState] = useState<AiMode | null>(initial.projectMode);
  const [phaseModes, setPhaseModes] = useState(initial.phaseModes);
  const [pm, setPm] = useState(initial.aiProjectManager);
  const [showIntro, setShowIntro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      setShowIntro(window.localStorage.getItem(INTRO_DISMISSED_KEY) !== "1");
    } catch {
      setShowIntro(true);
    }
  }, []);

  function dismissIntro() {
    setShowIntro(false);
    try {
      window.localStorage.setItem(INTRO_DISMISSED_KEY, "1");
    } catch {
      // ignore storage errors (private browsing etc.)
    }
  }

  function run(action: () => Promise<void>, rollback: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        rollback();
        setError(t("saveError"));
      }
    });
  }

  function chooseProjectMode(mode: AiMode) {
    const prev = projectMode;
    setProjectModeState(mode);
    run(() => setProjectAiMode(slug, mode), () => setProjectModeState(prev));
  }

  function choosePhaseMode(phase: DisplayPhase, mode: AiMode | null) {
    const prev = phaseModes;
    setPhaseModes((m) => {
      const next = { ...m };
      if (mode) next[phase] = mode;
      else delete next[phase];
      return next;
    });
    run(() => setPhaseAiMode(slug, phase, mode), () => setPhaseModes(prev));
  }

  function togglePm() {
    const next = !pm;
    setPm(next);
    run(() => setAiProjectManager(slug, next), () => setPm(!next));
  }

  return (
    <section className="mt-12 pt-8 border-t border-muted-teal/30" aria-labelledby="ai-settings-heading">
      <h2 id="ai-settings-heading" className="text-lg font-semibold text-dark-slate">{t("settingsHeading")}</h2>

      {showIntro && (
        <div className="mt-3 flex items-start gap-3 rounded-lg bg-seagrass/10 border border-seagrass/30 p-3 text-sm text-dark-slate/80">
          <p className="flex-1">{t("intro")}</p>
          <button type="button" onClick={dismissIntro} className="shrink-0 text-xs text-dark-slate/50 hover:text-dark-slate">
            {t("introDismiss")}
          </button>
        </div>
      )}

      <h3 className="mt-6 text-sm font-medium text-dark-slate">{t("projectModeHeading")}</h3>
      {projectMode === null && <p className="mt-1 text-xs text-dark-slate/50">{t("legacyNote")}</p>}
      <div role="radiogroup" aria-label={t("projectModeHeading")} className="mt-2 grid gap-2 sm:grid-cols-3">
        {MODES.map((mode) => {
          const selected = projectMode === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={isPending}
              onClick={() => chooseProjectMode(mode)}
              className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-60 ${
                selected ? "border-seagrass bg-seagrass/10" : "border-muted-teal/40 bg-white hover:border-seagrass/60"
              }`}
            >
              <span className={`block text-sm font-semibold ${selected ? "text-seagrass" : "text-dark-slate"}`}>
                {t(MODE_KEYS[mode].label)}
              </span>
              <span className="block mt-1 text-xs text-dark-slate/60">{t(MODE_KEYS[mode].desc)}</span>
            </button>
          );
        })}
      </div>

      <h3 className="mt-6 text-sm font-medium text-dark-slate">{t("phaseModesHeading")}</h3>
      <p className="mt-1 text-xs text-dark-slate/50">{t("phaseModesHint")}</p>
      <ul className="mt-2 divide-y divide-muted-teal/20 rounded-lg border border-muted-teal/30 bg-white">
        {DISPLAY_PHASES.map(({ value }) => {
          const phase = value as DisplayPhase;
          return (
            <li key={phase} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm text-dark-slate">{tPhase(phase)}</span>
              <AiModePicker
                value={phaseModes[phase] ?? null}
                inherited={projectMode}
                disabled={isPending}
                onChange={(mode) => choosePhaseMode(phase, mode)}
              />
            </li>
          );
        })}
      </ul>

      <label className="mt-6 flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={pm} onChange={togglePm} disabled={isPending} className="mt-0.5 accent-seagrass" />
        <span>
          <span className="block text-sm font-medium text-dark-slate">{t("projectManagerLabel")}</span>
          <span className="block text-xs text-dark-slate/60">{t("projectManagerHint")}</span>
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-watermelon">{error}</p>}
    </section>
  );
}
