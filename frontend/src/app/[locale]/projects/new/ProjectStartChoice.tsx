import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { startDreamConversation } from "./samtal/actions";
import DeleteDreamButton from "./DeleteDreamButton";

type InProgress = { roomId: string; updatedAt: Date; coveredCount: number };

// Vägvalet at the start of a new project (behind the ai-project-start flag):
// AI or not: the AI card starts Drömsamtalet in AGENT mode, "Jag gör det
// själv" goes to Snabbstart with AI switched off (?ai=off).
export default async function ProjectStartChoice({ inProgress }: { inProgress: InProgress[] }) {
  const t = await getTranslations("ProjectStart");

  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
      <p className="mt-2 text-sm text-dark-slate/70">{t("intro")}</p>

      {inProgress.length > 0 && (
        <div className="mt-6 rounded-xl border border-seagrass/40 bg-seagrass/5 p-4">
          <p className="text-sm font-semibold text-dark-slate">{t("resumeHeading")}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {inProgress.map((c) => (
              <li key={c.roomId} className="flex items-baseline justify-between gap-3">
                <Link href={`/projects/new/samtal/${c.roomId}`} className="text-sm font-medium text-seagrass hover:underline">
                  {t("resumeLink", { covered: c.coveredCount, date: c.updatedAt.toLocaleDateString("sv-SE") })}
                </Link>
                <DeleteDreamButton roomId={c.roomId} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* One choice: AI or not. The AI way is "Låt AI:n göra jobbet" — what it
          drafts can be overwritten, and AI turned down or off later in the
          project's AI settings, so there's no second AI mode to pick here. */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-seagrass bg-seagrass/5 p-5">
          <span className="self-start rounded-full bg-seagrass/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-seagrass">{t("recommended")}</span>
          <h2 className="mt-2 text-lg font-semibold text-dark-slate">{t("aiTitle")}</h2>
          <p className="mt-1 text-sm text-dark-slate/70">{t("aiDesc")}</p>
          <ul className="mt-4 flex flex-col gap-1.5 text-sm text-dark-slate/80">
            <li>✓ {t("aiPoint1")}</li>
            <li>✓ {t("aiPoint2")}</li>
            <li>✓ {t("aiPoint3")}</li>
          </ul>
          <form action={startDreamConversation.bind(null, "AGENT")} className="mt-auto pt-5">
            <button type="submit" className="w-full rounded-full bg-seagrass px-5 py-2.5 text-sm font-semibold text-white hover:bg-seagrass/90">
              {t("aiCta")}
            </button>
          </form>
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
