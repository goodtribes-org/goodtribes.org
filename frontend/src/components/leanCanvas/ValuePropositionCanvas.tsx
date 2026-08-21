"use client";

import { useTranslations } from "next-intl";
import ValuePropositionField from "./ValuePropositionField";

export type VpField = "vpJobs" | "vpPains" | "vpGains" | "vpProducts" | "vpRelievers" | "vpCreators";

const VP_FIELDS: VpField[] = ["vpJobs", "vpPains", "vpGains", "vpProducts", "vpRelievers", "vpCreators"];

interface Props {
  values: Partial<Record<VpField, string | null>> & { uniqueValueProposition?: string | null };
  canEdit: boolean;
  onSaveField: (field: VpField, formData: FormData) => Promise<void>;
}

export default function ValuePropositionCanvas({ values, canEdit, onSaveField }: Props) {
  const t = useTranslations("ValuePropositionCanvas");

  const hasNewContent = VP_FIELDS.some((f) => values[f]);
  const legacy = values.uniqueValueProposition;

  return (
    <div data-area="vp" className="border border-muted-teal/30 rounded-lg bg-white p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{t("title")}</h3>
        <span className="text-[10px] text-dark-slate/40">{t("subtitle")}</span>
      </div>

      {!hasNewContent && legacy && (
        <div className="mb-3 rounded-md bg-dry-sage/10 border border-dry-sage/30 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-dark-slate/50 mb-0.5">
            {t("legacyLabel")}
          </p>
          <p className="text-xs text-dark-slate/70 whitespace-pre-wrap">{legacy}</p>
        </div>
      )}

      <div className="vp-canvas-body">
        <div className="vp-side">
          <p className="vp-side-head">
            <span className="text-coral">{t("valueMapTitle")}</span>{" "}
            <span className="text-dark-slate/40 font-normal">— {t("valueMapSub")}</span>
          </p>
          <ValuePropositionField
            accent="value"
            label={t("fieldProducts")}
            hint={t("hintProducts")}
            value={values.vpProducts ?? null}
            canEdit={canEdit}
            onSave={(fd) => onSaveField("vpProducts", fd)}
          />
          <ValuePropositionField
            accent="value"
            label={t("fieldRelievers")}
            hint={t("hintRelievers")}
            value={values.vpRelievers ?? null}
            canEdit={canEdit}
            onSave={(fd) => onSaveField("vpRelievers", fd)}
          />
          <ValuePropositionField
            accent="value"
            label={t("fieldCreators")}
            hint={t("hintCreators")}
            value={values.vpCreators ?? null}
            canEdit={canEdit}
            onSave={(fd) => onSaveField("vpCreators", fd)}
          />
        </div>

        <div className="vp-fit" aria-hidden="true">
          <span className="vp-fit-badge">{t("fitBadge")}</span>
        </div>

        <div className="vp-side">
          <p className="vp-side-head">
            <span className="text-seagrass">{t("customerProfileTitle")}</span>{" "}
            <span className="text-dark-slate/40 font-normal">— {t("customerProfileSub")}</span>
          </p>
          <ValuePropositionField
            accent="customer"
            label={t("fieldJobs")}
            hint={t("hintJobs")}
            value={values.vpJobs ?? null}
            canEdit={canEdit}
            onSave={(fd) => onSaveField("vpJobs", fd)}
          />
          <ValuePropositionField
            accent="customer"
            label={t("fieldPains")}
            hint={t("hintPains")}
            value={values.vpPains ?? null}
            canEdit={canEdit}
            onSave={(fd) => onSaveField("vpPains", fd)}
          />
          <ValuePropositionField
            accent="customer"
            label={t("fieldGains")}
            hint={t("hintGains")}
            value={values.vpGains ?? null}
            canEdit={canEdit}
            onSave={(fd) => onSaveField("vpGains", fd)}
          />
        </div>
      </div>

      <style>{`
        [data-area="vp"] { container-type: inline-size; }
        .vp-canvas-body { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        .vp-side { display: flex; flex-direction: column; gap: 0.5rem; }
        .vp-side-head { font-size: 12px; font-weight: 700; }
        .vp-fit { display: flex; align-items: center; justify-content: center; }
        .vp-fit-badge {
          font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--color-watermelon); background: rgba(209, 5, 5, .08);
          border: 1px solid rgba(209, 5, 5, .25); border-radius: 999px; padding: 3px 10px;
        }
        @container (min-width: 560px) {
          .vp-canvas-body { grid-template-columns: 1fr auto 1fr; }
          .vp-fit { flex-direction: column; }
          .vp-fit-badge { writing-mode: vertical-rl; text-orientation: mixed; padding: 8px 4px; }
        }
      `}</style>
    </div>
  );
}
