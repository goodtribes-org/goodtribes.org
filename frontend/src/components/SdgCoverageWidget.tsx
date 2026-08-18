import { getTranslations } from "next-intl/server";
import { SdgIcon } from "@/components/SdgIcon";

const ALL_GOALS = Array.from({ length: 17 }, (_, i) => i + 1);

export default async function SdgCoverageWidget({ coveredGoals }: { coveredGoals: number[] }) {
  const t = await getTranslations("SdgCoverageWidget");
  const covered = new Set(coveredGoals);

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">{t("heading")}</h2>
        <span className="text-xs text-dark-slate/50">{t("goalsCovered", { count: covered.size })}</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {ALL_GOALS.map((n) => (
          <div key={n} className={covered.has(n) ? "" : "opacity-20"} title={covered.has(n) ? undefined : t("noProjectYetTitle")}>
            <SdgIcon n={n} size={32} />
          </div>
        ))}
      </div>
    </section>
  );
}
