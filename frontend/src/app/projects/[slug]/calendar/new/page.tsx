export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { createCalendarEvent } from "../actions";
import type { Metadata } from "next";
import NewEventForm from "./NewEventForm";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!project) return {};
  return { title: `${project.title} — Ny händelse — GoodTribes.org` };
}

export default async function NewCalendarEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth();
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
          ← Kalender
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">Ny händelse</h1>
      </div>

      <NewEventForm slug={slug} defaultType={sp.type} action={boundAction} />
    </div>
  );
}
