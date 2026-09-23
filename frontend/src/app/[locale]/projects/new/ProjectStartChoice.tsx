import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { startDreamConversation } from "./samtal/actions";

type InProgress = { roomId: string; updatedAt: Date; coveredCount: number };

// Vägvalet at the start of a new project (behind the ai-project-start flag):
// let the AI do the work, get help from the AI, or do everything yourself.
// The first two start Drömsamtalet; the third is today's Snabbstart.
export default async function ProjectStartChoice({ inProgress }: { inProgress: InProgress[] }) {
  const t = await getTranslations("ProjectStart");

  const cardBase = "flex h-full flex-col rounded-2xl border p-5 text-left transition-colors";

  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
      <p className="mt-2 text-sm text-dark-slate/70">{t("intro")}</p>

      {inProgress.length > 0 && (
        <div className="mt-6 rounded-xl border border-seagrass/40 bg-seagrass/5 p-4">
          <p className="text-sm font-semibold text-dark-slate">{t("resumeHeading")}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {inProgress.map((c) => (
              <li key={c.roomId}>
                <Link href={`/projects/new/samtal/${c.roomId}`} className="text-sm font-medium text-seagrass hover:underline">
                  {t("resumeLink", { covered: c.coveredCount, date: c.updatedAt.toLocaleDateString("sv-SE") })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <form action={startDreamConversation.bind(null, "AGENT")} className="h-full">
          <button type="submit" className={`${cardBase} w-full border-seagrass bg-seagrass/10 hover:bg-seagrass/15`}>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-seagrass">{t("recommended")}</span>
            <span className="mt-1 text-base font-semibold text-dark-slate">{t("agentTitle")}</span>
            <span className="mt-2 text-sm text-dark-slate/70">{t("agentDesc")}</span>
          </button>
        </form>
        <form action={startDreamConversation.bind(null, "ASSIST")} className="h-full">
          <button type="submit" className={`${cardBase} w-full border-muted-teal/50 bg-white hover:border-seagrass/60`}>
            <span className="mt-[18px] text-base font-semibold text-dark-slate">{t("assistTitle")}</span>
            <span className="mt-2 text-sm text-dark-slate/70">{t("assistDesc")}</span>
          </button>
        </form>
        <Link href="/projects/new?manual=1" className={`${cardBase} border-muted-teal/50 bg-white hover:border-seagrass/60`}>
          <span className="mt-[18px] text-base font-semibold text-dark-slate">{t("manualTitle")}</span>
          <span className="mt-2 text-sm text-dark-slate/70">{t("manualDesc")}</span>
        </Link>
      </div>

      <p className="mt-4 text-xs text-dark-slate/50">{t("changeLater")}</p>
    </div>
  );
}
