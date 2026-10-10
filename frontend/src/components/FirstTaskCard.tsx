import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { FirstTaskListItem } from "@/lib/firstTasks";
import { SDG_COLORS, SDG_LABELS_SV } from "@/lib/sdg";

// One första uppgift in a list across projects (#279): who and which dream,
// the task, why it matters, tokens, time, place, form and global goals.
// "Jag tar den" opens it on the project's page (?take=), where it's taken or
// signed up for — the same sheet as on the project itself.
export default async function FirstTaskCard({ task }: { task: FirstTaskListItem }) {
  const t = await getTranslations("FirstTasksDiscover");
  const tTask = await getTranslations("FirstTasks");
  const initials = (task.founder.name ?? task.project.title).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex h-full w-full flex-col gap-2.5 rounded-2xl border border-[#E4E4DF] bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-[#4A514D]">
        {task.founder.image ? (
          <img src={task.founder.image} alt="" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FDE6DA] text-[10px] font-bold text-[#9A3412]">{initials}</span>
        )}
        <Link href={`/projects/${task.project.slug}`} className="min-w-0 truncate font-bold text-[#1B1F1D] hover:underline">{task.project.title}</Link>
      </div>
      <p className="text-base font-bold leading-snug text-[#1B1F1D]">{task.title}</p>
      {task.why && <p className="text-sm leading-relaxed text-[#4A514D] line-clamp-3">{task.why}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <span className="rounded-full bg-[#FFF1C2] px-2.5 py-1 text-xs font-bold text-[#8A5A00]">{tTask("tokens", { count: task.tokens })}</span>
        {task.time && <span className="rounded-full bg-[#F3F1EC] px-2.5 py-1 text-xs font-semibold text-[#4A514D]">⏱ {tTask(`time_${task.time}`)}</span>}
        <span className="rounded-full bg-[#F3F1EC] px-2.5 py-1 text-xs font-semibold text-[#4A514D]">📍 {task.place ?? tTask("remote")}</span>
        <span className="rounded-full bg-[#F3F1EC] px-2.5 py-1 text-xs font-semibold text-[#4A514D]">{task.project.commercial ? t("commercial") : t("nonprofit")}</span>
        {task.project.sdgGoals.slice(0, 3).map((g) => (
          <span key={g} title={`${g}. ${SDG_LABELS_SV[g]}`} className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: SDG_COLORS[g] }}>
            {g}
          </span>
        ))}
      </div>
      <Link
        href={`/projects/${task.project.slug}?take=${task.id}#forsta-uppgifter`}
        className="mt-1 rounded-full bg-[#E8531F] px-3 py-2 text-center text-sm font-bold text-white hover:opacity-90"
      >
        {task.choose ? tTask("signUp") : tTask("take")}
      </Link>
      {task.choose && <p className="-mt-1 text-center text-[11px] text-[#6B726E]">{tTask("chooseNote")}</p>}
    </div>
  );
}
