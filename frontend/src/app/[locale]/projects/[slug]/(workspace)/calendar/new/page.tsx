export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { createCalendarEvent } from "../actions";
import type { Metadata } from "next";
import NewEventForm from "./NewEventForm";
import type { Locale } from "next-intl";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [project, t] = await Promise.all([
    prisma.project.findUnique({ where: { slug }, select: { title: true } }),
    getTranslations({ locale, namespace: "NewCalendarEventPage" }),
  ]);
  if (!project) return {};
  return { title: `${project.title} — ${t("metaTitleSuffix")} — GoodTribes.org` };
}

export default async function NewCalendarEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale, slug } = await params;
  const [sp, session, t] = await Promise.all([
    searchParams,
    auth(),
    getTranslations({ locale, namespace: "NewCalendarEventPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!project) notFound();

  const boundAction = createCalendarEvent.bind(null, slug);

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href={`/projects/${slug}/calendar`}
          className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
        >
          {t("backToCalendar")}
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">{t("heading")}</h1>
      </div>

      <NewEventForm slug={slug} defaultType={sp.type} action={boundAction} />
    </div>
  );
}
