export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import FirstTaskCard from "@/components/FirstTaskCard";
import { EVENT_COOKIE, getEventByCode, getEventProgress, getEventProjectIds } from "@/lib/events";
import { parseFirstTaskFilters, searchFirstTasks } from "@/lib/firstTasks";
import EventFirstTaskForm from "./EventFirstTaskForm";

// The evening's page (#281), where the QR code lands: three steps — write
// your dream, open a first task in it, help someone else in the room — with a
// tick for each step you've done tonight.

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByCode(code);
  return { title: event?.title ?? "GoodTribes", robots: { index: false, follow: false } };
}

function Step({ n, done, title, body, children }: { n: number; done: boolean; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <section className={`rounded-3xl border p-5 sm:p-6 ${done ? "border-[#2F7D3A]/40 bg-[#EAF4EC]" : "border-[#E4E4DF] bg-white"}`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${done ? "bg-[#2F7D3A] text-white" : "bg-[#E8531F] text-white"}`}>
          {done ? "✓" : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-[#1B1F1D]">{title}</h2>
          {body && <p className="mt-1 text-sm text-[#4A514D]">{body}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}

export default async function EventPage({ params, searchParams }: { params: Promise<{ locale: Locale; code: string }>; searchParams: Promise<{ k?: string }> }) {
  const { locale, code } = await params;
  const { k } = await searchParams;
  const event = await getEventByCode(code);
  if (!event) notFound();
  // Arrived without the QR link (a shared URL): take the link once, so what
  // they do tonight counts for the evening. ?k=1 is the way back from it, so
  // a browser that blocks cookies doesn't bounce forever.
  if (!k && (await cookies()).get(EVENT_COOKIE)?.value !== event.code) redirect(`/api/e/${event.code}`);

  const t = await getTranslations({ locale, namespace: "Event" });
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const progress = userId ? await getEventProgress(event.id, userId) : { dreams: [], openedTask: false, helped: false };
  const eventProjectIds = await getEventProjectIds(event.id);
  const fromTonight = await searchFirstTasks(parseFirstTaskFilters({}), { take: 10 }, { onlyProjectIds: eventProjectIds, notOwnedBy: userId });
  const more = fromTonight.items.length < 4
    ? await searchFirstTasks(parseFirstTaskFilters({}), { take: 6 }, { notOwnedBy: userId })
    : { items: [], total: 0 };
  const moreItems = more.items.filter((m) => !fromTonight.items.some((x) => x.id === m.id));
  const stepsDone = [progress.dreams.length > 0, progress.openedTask, progress.helped].filter(Boolean).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-16">
      <header className="pt-2">
        <p className="text-sm font-bold uppercase tracking-[.12em] text-[#C2410C]">{event.title}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1B1F1D] sm:text-4xl">{t("heading")}</h1>
        <p className="mt-2 text-base text-[#4A514D]">{t("intro")}</p>
        {userId && <p className="mt-2 text-sm font-semibold text-[#2F7D3A]">{t("progress", { done: stepsDone })}</p>}
      </header>

      <Step n={1} done={progress.dreams.length > 0} title={t("step1Title")} body={progress.dreams.length ? t("step1Done", { title: progress.dreams[0].title }) : t("step1Body")}>
        {progress.dreams.length === 0 && (
          <Link href="/projects/new" className="mt-3 inline-flex rounded-full bg-[#E8531F] px-5 py-2.5 font-bold text-white">{t("step1Cta")}</Link>
        )}
      </Step>

      <Step n={2} done={progress.openedTask} title={t("step2Title")} body={progress.openedTask ? t("step2Done") : t("step2Body")}>
        {!progress.openedTask && progress.dreams.length > 0 && (
          <EventFirstTaskForm dreams={progress.dreams.map((d) => ({ id: d.id, title: d.title, published: !!d.publishedAt }))} />
        )}
        {!progress.openedTask && progress.dreams.length === 0 && <p className="mt-2 text-xs text-[#6B726E]">{t("step2Waiting")}</p>}
      </Step>

      <Step n={3} done={progress.helped} title={t("step3Title")} body={progress.helped ? t("step3Done") : t("step3Body")}>
        {fromTonight.items.length > 0 && (
          <>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#6B726E]">{t("fromTonight")}</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fromTonight.items.map((task) => <FirstTaskCard key={task.id} task={task} />)}
            </div>
          </>
        )}
        {moreItems.length > 0 && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#6B726E]">{t("moreTasks")}</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {moreItems.map((task) => <FirstTaskCard key={task.id} task={task} />)}
            </div>
          </>
        )}
        {fromTonight.items.length === 0 && moreItems.length === 0 && <p className="mt-2 text-xs text-[#6B726E]">{t("noTasksYet")}</p>}
      </Step>
    </div>
  );
}
