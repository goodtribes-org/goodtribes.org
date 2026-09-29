"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { AssumptionRisk, AssumptionStatus } from "@prisma/client";
import type { AssumptionProposal, StatusHint } from "@/lib/assumptionRules";
import {
  acceptAssumptions,
  applyInterviewHint,
  createAssumption,
  deleteAssumption,
  findAssumptions,
  updateAssumption,
} from "@/lib/actions/assumptions";

export type AssumptionRow = {
  id: string;
  text: string;
  risk: AssumptionRisk;
  status: AssumptionStatus;
  testPlan: string | null;
  evidence: string | null;
  fieldKey: string | null;
  origin: string;
};

const RISKS: AssumptionRisk[] = ["HIGH", "MEDIUM", "LOW"];
const STATUSES: AssumptionStatus[] = ["UNTESTED", "TESTING", "SUPPORTED", "REFUTED"];
const RISK_STYLE: Record<AssumptionRisk, string> = {
  HIGH: "border-watermelon/40 bg-watermelon/10 text-watermelon",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-700",
  LOW: "border-muted-teal/40 bg-muted-teal/10 text-dark-slate/60",
};
const STATUS_STYLE: Record<AssumptionStatus, string> = {
  UNTESTED: "text-dark-slate/60",
  TESTING: "text-seagrass",
  SUPPORTED: "text-seagrass font-semibold",
  REFUTED: "text-watermelon font-semibold",
};

/**
 * The Idé phase's assumptions — the loop the phase is built around:
 * assumption → test → learning → update. Rows arrive already sorted
 * (riskiest untested first; lib/assumptionRules.ts), and the first open
 * one is the "Det viktigaste nu" card. AI only proposes (Hitta antaganden);
 * the team decides what to keep and every status change.
 */
export default function AssumptionsSection({
  slug,
  assumptions,
  hints,
  fieldLabels,
  canEdit,
  canUseAi,
}: {
  slug: string;
  assumptions: AssumptionRow[];
  hints: StatusHint[];
  fieldLabels: Record<string, string>;
  canEdit: boolean;
  canUseAi: boolean;
}) {
  const t = useTranslations("Assumptions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<(AssumptionProposal & { keep: boolean })[] | null>(null);

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function find() {
    setError(null);
    startTransition(async () => {
      const res = await findAssumptions(slug);
      if ("error" in res) setError(res.error);
      else setProposals(res.proposals.map((p) => ({ ...p, keep: p.risk !== "LOW" })));
    });
  }

  const hintFor = (id: string) => hints.find((h) => h.assumptionId === id);
  const next = assumptions.find((a) => a.status === "UNTESTED" || a.status === "TESTING") ?? null;
  const fieldOptions = Object.entries(fieldLabels);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-dark-slate/70">{t("intro")}</p>

      {next && (
        <div className="rounded-xl border border-coral/40 bg-coral/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-coral">{t("nextHeading")}</p>
          <p className="mt-1 font-medium text-dark-slate">{next.text}</p>
          {next.testPlan && (
            <p className="mt-1 text-sm text-dark-slate/70">
              <span className="font-medium">{t("testLabel")}:</span> {next.testPlan}
            </p>
          )}
          {canEdit && next.status === "UNTESTED" && (
            <button type="button" disabled={pending} onClick={() => run(() => updateAssumption(next.id, { status: "TESTING" }))} className="mt-2 text-sm font-semibold text-coral hover:text-watermelon disabled:opacity-50">
              {t("startTesting")}
            </button>
          )}
        </div>
      )}

      {assumptions.length === 0 ? (
        <p className="text-sm text-dark-slate/50">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-muted-teal/20">
          {assumptions.map((a) => {
            const hint = hintFor(a.id);
            const open = openId === a.id;
            return (
              <li key={a.id} className="py-3">
                <div className="flex flex-wrap items-start gap-2">
                  {canEdit ? (
                    <select
                      aria-label={t("riskLabel")}
                      value={a.risk}
                      disabled={pending}
                      onChange={(e) => run(() => updateAssumption(a.id, { risk: e.target.value }))}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RISK_STYLE[a.risk]}`}
                    >
                      {RISKS.map((r) => (
                        <option key={r} value={r}>
                          {t(`risk_${r}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RISK_STYLE[a.risk]}`}>{t(`risk_${a.risk}`)}</span>
                  )}
                  <button type="button" onClick={() => setOpenId(open ? null : a.id)} className="min-w-0 flex-1 text-left text-sm text-dark-slate hover:text-coral">
                    {a.text}
                    {a.fieldKey && fieldLabels[a.fieldKey] && <span className="ml-2 text-xs text-dark-slate/40">{fieldLabels[a.fieldKey]}</span>}
                  </button>
                  {canEdit ? (
                    <select
                      aria-label={t("statusLabel")}
                      value={a.status}
                      disabled={pending}
                      onChange={(e) => run(() => updateAssumption(a.id, { status: e.target.value }))}
                      className={`rounded border border-muted-teal/40 bg-white px-1.5 py-0.5 text-xs ${STATUS_STYLE[a.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`status_${s}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs ${STATUS_STYLE[a.status]}`}>{t(`status_${a.status}`)}</span>
                  )}
                </div>

                {hint && canEdit && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-seagrass/10 px-2 py-1.5 text-xs text-dark-slate/80">
                    <span>
                      {t("hint", { status: t(`status_${hint.status}`) })} {hint.reason}
                    </span>
                    <button type="button" disabled={pending} onClick={() => run(() => applyInterviewHint(a.id))} className="font-semibold text-seagrass hover:underline disabled:opacity-50">
                      {t("applyHint")}
                    </button>
                  </div>
                )}

                {open && <AssumptionDetails row={a} canEdit={canEdit} pending={pending} run={run} onClose={() => setOpenId(null)} />}
              </li>
            );
          })}
        </ul>
      )}

      {proposals && (
        <div className="rounded-xl border border-seagrass/30 bg-seagrass/5 p-4">
          <p className="text-sm font-semibold text-dark-slate">{t("proposalsHeading")}</p>
          <p className="text-xs text-dark-slate/60">{t("proposalsIntro")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {proposals.map((p, i) => (
              <li key={i}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.keep}
                    onChange={(e) => setProposals(proposals.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))}
                    className="mt-1"
                  />
                  <span>
                    <span className={`mr-2 rounded-full border px-1.5 py-px text-[10px] font-semibold ${RISK_STYLE[p.risk]}`}>{t(`risk_${p.risk}`)}</span>
                    {p.text}
                    {p.testPlan && <span className="block text-xs text-dark-slate/60">{t("testLabel")}: {p.testPlan}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={pending || !proposals.some((p) => p.keep)}
              onClick={() =>
                run(
                  () => acceptAssumptions(slug, proposals.filter((p) => p.keep).map(({ keep: _keep, ...p }) => p)),
                  () => setProposals(null),
                )
              }
              className="rounded-lg bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50"
            >
              {t("addSelected")}
            </button>
            <button type="button" onClick={() => setProposals(null)} className="text-sm text-dark-slate/50 hover:text-dark-slate">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {canEdit &&
        (adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(
                () =>
                  createAssumption(slug, {
                    text: String(f.get("text") ?? ""),
                    risk: String(f.get("risk") ?? "MEDIUM"),
                    testPlan: String(f.get("testPlan") ?? ""),
                    fieldKey: String(f.get("fieldKey") ?? "") || null,
                  }),
                () => setAdding(false),
              );
            }}
            className="flex flex-col gap-2 rounded-xl border border-muted-teal/30 p-3"
          >
            <textarea name="text" rows={2} required placeholder={t("textPlaceholder")} className="w-full rounded border border-muted-teal px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
            <input name="testPlan" placeholder={t("testPlaceholder")} className="w-full rounded border border-muted-teal px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
            <div className="flex flex-wrap gap-2">
              <select name="risk" defaultValue="MEDIUM" aria-label={t("riskLabel")} className="rounded border border-muted-teal px-2 py-1 text-sm">
                {RISKS.map((r) => (
                  <option key={r} value={r}>
                    {t(`risk_${r}`)}
                  </option>
                ))}
              </select>
              <select name="fieldKey" defaultValue="" aria-label={t("fieldLabel")} className="min-w-0 flex-1 rounded border border-muted-teal px-2 py-1 text-sm">
                <option value="">{t("noField")}</option>
                {fieldOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={pending} className="rounded-lg bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50">
                {t("save")}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-dark-slate/50 hover:text-dark-slate">
                {t("cancel")}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setAdding(true)} className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-sm font-medium text-seagrass hover:bg-seagrass/10">
              {t("add")}
            </button>
            {canUseAi && !proposals && (
              <button type="button" disabled={pending} onClick={find} className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-sm font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-50">
                {pending ? t("finding") : `✨ ${t("find")}`}
              </button>
            )}
          </div>
        ))}

      {error && <p className="text-sm text-watermelon">{error}</p>}
    </div>
  );
}

function AssumptionDetails({
  row,
  canEdit,
  pending,
  run,
  onClose,
}: {
  row: AssumptionRow;
  canEdit: boolean;
  pending: boolean;
  run: (action: () => Promise<{ error?: string }>, after?: () => void) => void;
  onClose: () => void;
}) {
  const t = useTranslations("Assumptions");
  if (!canEdit) {
    return (
      <div className="mt-2 flex flex-col gap-1 pl-2 text-xs text-dark-slate/70">
        {row.testPlan && <p><span className="font-medium">{t("testLabel")}:</span> {row.testPlan}</p>}
        {row.evidence && <p className="whitespace-pre-wrap"><span className="font-medium">{t("evidenceLabel")}:</span> {row.evidence}</p>}
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(
          () => updateAssumption(row.id, { text: String(f.get("text") ?? ""), testPlan: String(f.get("testPlan") ?? ""), evidence: String(f.get("evidence") ?? "") }),
          onClose,
        );
      }}
      className="mt-2 flex flex-col gap-2 rounded-lg bg-dry-sage/10 p-3 text-sm"
    >
      <textarea name="text" rows={2} defaultValue={row.text} aria-label={t("textLabel")} className="w-full rounded border border-muted-teal px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-coral" />
      <label className="flex flex-col gap-1 text-xs text-dark-slate/70">
        {t("testLabel")}
        <textarea name="testPlan" rows={2} defaultValue={row.testPlan ?? ""} placeholder={t("testPlaceholder")} className="rounded border border-muted-teal px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-dark-slate/70">
        {t("evidenceLabel")}
        <textarea name="evidence" rows={3} defaultValue={row.evidence ?? ""} placeholder={t("evidencePlaceholder")} className="rounded border border-muted-teal px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-coral px-3 py-1 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50">
          {t("save")}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-dark-slate/50 hover:text-dark-slate">
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(t("deleteConfirm"))) run(() => deleteAssumption(row.id), onClose);
          }}
          className="ml-auto text-xs text-watermelon/70 hover:text-watermelon disabled:opacity-50"
        >
          {t("delete")}
        </button>
      </div>
    </form>
  );
}
