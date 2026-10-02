import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { startDreamConversation } from "./samtal/actions";

type InProgress = { roomId: string; updatedAt: Date; coveredCount: number };

// Vägvalet at the start of a new project (behind the ai-project-start flag):
// AI or not first; the two AI modes start Drömsamtalet, "Jag gör det
// själv" goes to Snabbstart with AI switched off (?ai=off).
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

      {/* First the real choice, AI or not; the two AI modes only appear
          inside the AI card, so someone who doesn't want AI never has to
          read about it. */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-seagrass bg-seagrass/5 p-5">
          <h2 className="text-lg font-semibold text-dark-slate">{t("aiTitle")}</h2>
          <p className="mt-1 text-sm text-dark-slate/70">{t("aiDesc")}</p>
          <div className="mt-4 flex flex-col gap-2">
            <form action={startDreamConversation.bind(null, "AGENT")}>
              <button type="submit" className={`${cardBase} w-full border-seagrass bg-white hover:bg-seagrass/10`}>
                <span className="flex items-center gap-2">
                  <span className="text-base font-semibold text-dark-slate">{t("agentTitle")}</span>
                  <span className="rounded-full bg-seagrass/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-seagrass">{t("recommended")}</span>
                </span>
                <span className="mt-1 text-sm text-dark-slate/70">{t("agentDesc")}</span>
              </button>
            </form>
            <form action={startDreamConversation.bind(null, "ASSIST")}>
              <button type="submit" className={`${cardBase} w-full border-muted-teal/50 bg-white hover:border-seagrass/60`}>
                <span className="text-base font-semibold text-dark-slate">{t("assistTitle")}</span>
                <span className="mt-1 text-sm text-dark-slate/70">{t("assistDesc")}</span>
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs text-dark-slate/50">{t("changeLater")}</p>
        </section>

        <Link href="/projects/new?ai=off" className="group flex flex-col rounded-2xl border border-muted-teal/50 bg-white p-5 hover:border-seagrass/60">
          <h2 className="text-lg font-semibold text-dark-slate">{t("manualTitle")}</h2>
          <p className="mt-1 text-sm text-dark-slate/70">{t("manualDesc")}</p>
          <ul className="mt-4 flex flex-col gap-1.5 text-sm text-dark-slate/80">
            <li>✓ {t("manualPoint1")}</li>
            <li>✓ {t("manualPoint2")}</li>
            <li>✓ {t("manualPoint3")}</li>
          </ul>
          <span className="mt-auto pt-5 text-sm font-semibold text-seagrass group-hover:underline">{t("manualCta")}</span>
        </Link>
      </div>

    </div>
  );
}
