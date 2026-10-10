export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { APP_URL } from "@/lib/metadata";
import { getEventByCode, getEventStats, type EventFeedItem } from "@/lib/events";
import AutoRefresh from "./AutoRefresh";

// The evening's big screen (#281): the QR code to join, how many dreams,
// first tasks and sign-ups so far, and what just happened — first names only.
// Public on purpose: it's projected in the room.

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventByCode(code);
  return { title: event?.title ?? "GoodTribes", robots: { index: false, follow: false } };
}

export default async function EventScreen({ params }: { params: Promise<{ locale: Locale; code: string }> }) {
  const { locale, code } = await params;
  const event = await getEventByCode(code);
  if (!event) notFound();
  const t = await getTranslations({ locale, namespace: "Event" });
  const stats = await getEventStats(event.id);
  const joinUrl = `${APP_URL}/api/e/${event.code}`;
  const qr = await QRCode.toDataURL(joinUrl, { margin: 1, width: 480, color: { dark: "#1B1F1D", light: "#FFFFFF" } });
  const line = (a: EventFeedItem) => t(`feed_${a.type}`, { who: a.who ?? t("someone"), project: a.project ?? "", task: a.task ?? "" });

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[#1B1F1D] p-8 text-white sm:p-12">
      <AutoRefresh />
      <div className="flex items-start justify-between gap-8">
        <div>
          <p className="text-lg font-bold uppercase tracking-[.14em] text-[#F6A57F]">{event.title}</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl">{t("screenHeading")}</h1>
          <p className="mt-4 text-xl text-white/80">{t("screenSteps")}</p>
        </div>
        <div className="shrink-0 rounded-3xl bg-white p-4 text-center">
          <img src={qr} alt={joinUrl} className="h-56 w-56" />
          <p className="mt-2 text-sm font-semibold text-[#1B1F1D]">{joinUrl.replace(/^https?:\/\//, "")}</p>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-6">
        {[
          [stats.dreams, t("statDreams")],
          [stats.firstTasks, t("statFirstTasks")],
          [stats.offers, t("statOffers")],
        ].map(([n, label]) => (
          <div key={label as string} className="rounded-3xl bg-white/5 p-6 text-center">
            <p className="text-7xl font-extrabold tabular-nums sm:text-8xl">{n as number}</p>
            <p className="mt-2 text-xl text-white/70">{label as string}</p>
          </div>
        ))}
      </div>
      <ul className="mt-10 flex flex-col gap-3 overflow-hidden text-2xl">
        {stats.latest.map((a) => (
          <li key={a.id} className="truncate"><span className="text-[#F6A57F]">♥</span> {line(a)}</li>
        ))}
        {stats.latest.length === 0 && <li className="text-white/60">{t("screenEmpty")}</li>}
      </ul>
    </div>
  );
}
