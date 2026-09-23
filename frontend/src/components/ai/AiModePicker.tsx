"use client";

import { useTranslations } from "next-intl";
import type { AiMode } from "@prisma/client";

const MODES: AiMode[] = ["AGENT", "ASSIST", "MANUAL"];

const SHORT_KEY: Record<AiMode, string> = { AGENT: "shortAgent", ASSIST: "shortAssist", MANUAL: "shortManual" };
const LONG_KEY: Record<AiMode, string> = { AGENT: "labelAgent", ASSIST: "labelAssist", MANUAL: "labelManual" };

/**
 * Compact three-way AI mode control, used per phase and per guide step.
 *
 * `value` is the mode explicitly chosen at this level (null = none);
 * `inherited` is what applies when nothing is chosen here (null = the
 * project has no AI mode yet, shown as "Standard"). An explicit choice is
 * shown filled; an inherited one is shown as a light outline, so it's
 * obvious which level decided. Clicking the explicit choice again clears it
 * (back to inheriting) when `allowInherit` is set.
 */
export default function AiModePicker({
  value,
  inherited,
  allowInherit = true,
  onChange,
  disabled,
  label,
}: {
  value: AiMode | null;
  inherited: AiMode | null;
  allowInherit?: boolean;
  onChange: (mode: AiMode | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  const t = useTranslations("AiMode");
  const effective = value ?? inherited;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-xs text-dark-slate/60">{label}</span>}
      <div role="radiogroup" aria-label={label ?? t("pickerLabel")} className="inline-flex rounded-lg border border-muted-teal/50 bg-white text-xs font-medium overflow-hidden">
        {MODES.map((mode) => {
          const explicit = value === mode;
          const inheritedHere = value === null && inherited === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={effective === mode}
              title={t(LONG_KEY[mode])}
              disabled={disabled}
              onClick={() => onChange(explicit && allowInherit ? null : mode)}
              className={`px-2.5 py-1.5 transition-colors disabled:opacity-50 ${
                explicit
                  ? "bg-seagrass text-white"
                  : inheritedHere
                    ? "bg-seagrass/10 text-seagrass"
                    : "text-dark-slate/60 hover:text-dark-slate hover:bg-dry-sage/20"
              }`}
            >
              {t(SHORT_KEY[mode])}
            </button>
          );
        })}
      </div>
      {value === null && (
        <span className="text-[11px] text-dark-slate/40">
          {inherited ? t("inheritedHint") : t("standardHint")}
        </span>
      )}
    </div>
  );
}
