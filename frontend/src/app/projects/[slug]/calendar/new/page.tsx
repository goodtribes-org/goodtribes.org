export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { createCalendarEvent } from "../actions";
import type { Metadata } from "next";


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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!project) notFound();

  // Bind slug so the server action receives (formData, projectSlug)
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

      <form action={boundAction} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
            Titel <span className="text-watermelon">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Händelsens titel"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
            Beskrivning
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Valfri beskrivning"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>

        {/* Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-dark-slate mb-1">
            Typ
          </label>
          <select
            id="type"
            name="type"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="meeting">Möte</option>
            <option value="deadline">Deadline</option>
            <option value="custom">Anpassad</option>
          </select>
        </div>

        {/* Starts at */}
        <div>
          <label htmlFor="startsAt" className="block text-sm font-medium text-dark-slate mb-1">
            Starttid <span className="text-watermelon">*</span>
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        {/* Ends at */}
        <div>
          <label htmlFor="endsAt" className="block text-sm font-medium text-dark-slate mb-1">
            Sluttid
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-coral text-white text-sm font-medium px-5 py-2 rounded hover:bg-watermelon transition-colors"
          >
            Skapa händelse
          </button>
          <Link
            href={`/projects/${slug}/calendar`}
            className="text-sm text-dark-slate/60 hover:text-dark-slate px-5 py-2 rounded border border-muted-teal/40 transition-colors"
          >
            Avbryt
          </Link>
        </div>
      </form>
    </div>
  );
}
