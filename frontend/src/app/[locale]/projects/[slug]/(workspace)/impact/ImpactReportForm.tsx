"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SDG_NUMBERS } from "@/lib/sdg";
import { SdgIcon } from "@/components/SdgIcon";
import type { ImpactReportKind } from "@/lib/impactReports";
import { createImpactReport, deleteImpactReport } from "./actions";

// ---------------------------------------------------------------------------
// ImpactReportForm — submits a claim for Foundation verification. Mirrors
// AddMetricForm's collapsed-button-then-panel shape so the two sit next to
// each other on the impact page without looking like different features.
// ---------------------------------------------------------------------------
export function ImpactReportForm({ projectSlug }: { projectSlug: string }) {
  const t = useTranslations("ImpactReportForm");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [kind, setKind] = useState<ImpactReportKind>("DELIVERED");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function toggleSdg(n: number) {
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createImpactReport(projectSlug, fd);
      formRef.current?.reset();
      setSelected([]);
      setKind("DELIVERED");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-coral hover:text-watermelon transition-colors"
      >
        {t("addReport")}
      </button>
    );
  }

  return (
    <div className="border border-muted-teal/40 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-dark-slate">{t("newReportHeading")}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
      <p className="text-xs text-dark-slate/50 mb-3 leading-relaxed">{t("intro")}</p>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        {/* Kind — first, because it changes what the rest of the form means:
            a delivered result and support received are both real figures, but
            only the first is this project's own impact. */}
        <div>
          <label className="block text-xs text-dark-slate/60 mb-1.5">{t("kindField")}</label>
          <div className="flex flex-col sm:flex-row gap-2">
            {(["DELIVERED", "SUPPORT_RECEIVED"] as const).map((k) => (
              <label
                key={k}
                className={`flex-1 flex items-start gap-2 border rounded px-3 py-2 cursor-pointer transition-colors ${
                  kind === k ? "border-coral bg-coral/5" : "border-muted-teal hover:border-muted-teal/80"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="mt-0.5 accent-coral"
                />
                <span>
                  <span className="block text-xs font-medium text-dark-slate">
                    {t(`kind.${k}.label`)}
                  </span>
                  <span className="block text-[11px] text-dark-slate/50 leading-snug">
                    {t(`kind.${k}.hint`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* SDG picker */}
        <div>
          <label className="block text-xs text-dark-slate/60 mb-1.5">{t("sdgField")}</label>
          <div className="flex flex-wrap gap-1.5">
            {SDG_NUMBERS.map((n) => {
              const isOn = selected.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleSdg(n)}
                  aria-pressed={isOn}
                  title={`SDG ${n}`}
                  className={`rounded transition-all ${
                    isOn ? "ring-2 ring-coral opacity-100" : "opacity-40 hover:opacity-80"
                  }`}
                >
                  <SdgIcon n={n} size={30} />
                </button>
              );
            })}
          </div>
          {selected.map((n) => (
            <input key={n} type="hidden" name="sdgGoals" value={n} />
          ))}
        </div>

        <div>
          <label className="block text-xs text-dark-slate/60 mb-1">{t("descriptionField")}</label>
          <input
            name="metricDescription"
            type="text"
            required
            placeholder={t("descriptionPlaceholder")}
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("qualifierField")}</label>
            <select
              name="valueQualifier"
              defaultValue="EXACT"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              <option value="EXACT">{t("qualifier.EXACT")}</option>
              <option value="AT_LEAST">{t("qualifier.AT_LEAST")}</option>
              <option value="APPROXIMATE">{t("qualifier.APPROXIMATE")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("valueField")}</label>
            <input
              name="metricValue"
              type="number"
              step="any"
              required
              placeholder={t("valuePlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("unitField")}</label>
            <input
              name="metricUnit"
              type="text"
              placeholder={t("unitPlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("periodStartField")}</label>
            <input
              name="periodStart"
              type="date"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("periodEndField")}</label>
            <input
              name="periodEnd"
              type="date"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-dark-slate/60 mb-1">
            {kind === "SUPPORT_RECEIVED" ? t("sourceFieldSupport") : t("sourceFieldDelivered")}
          </label>
          <input
            name="sourceName"
            type="text"
            placeholder={
              kind === "SUPPORT_RECEIVED"
                ? t("sourcePlaceholderSupport")
                : t("sourcePlaceholderDelivered")
            }
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" name="isCumulative" className="mt-0.5 accent-coral" />
          <span>
            <span className="block text-xs font-medium text-dark-slate">{t("cumulativeField")}</span>
            <span className="block text-[11px] text-dark-slate/50 leading-snug">
              {t("cumulativeHint")}
            </span>
          </span>
        </label>

        <div>
          <label className="block text-xs text-dark-slate/60 mb-1">{t("evidenceField")}</label>
          <input
            name="evidenceUrl"
            type="url"
            placeholder={t("evidencePlaceholder")}
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <p className="text-[11px] text-dark-slate/40 mt-1">{t("evidenceHint")}</p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="submit"
            disabled={pending || selected.length === 0}
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors disabled:opacity-50"
          >
            {pending ? t("saving") : t("submit")}
          </button>
          {selected.length === 0 && (
            <span className="text-xs text-dark-slate/40">{t("sdgRequired")}</span>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WithdrawReportButton — only rendered for still-pending reports; the server
// action enforces that same rule independently.
// ---------------------------------------------------------------------------
export function WithdrawReportButton({
  projectSlug,
  reportId,
}: {
  projectSlug: string;
  reportId: string;
}) {
  const t = useTranslations("ImpactReportForm");
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteImpactReport(projectSlug, reportId))}
      className="text-xs text-dark-slate/40 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {pending ? t("withdrawing") : t("withdraw")}
    </button>
  );
}
