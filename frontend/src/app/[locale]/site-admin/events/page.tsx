export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/authz";
import { APP_URL } from "@/lib/metadata";
import { createEvent } from "./actions";

// Event (#281): evenings with a QR code. The QR link sets which evening
// someone is at; the evening's page has the three steps, the big screen the
// numbers. Swedish only, like the rest of site admin.
export default async function EventsAdminPage() {
  await requireAdminSession();
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, title: true, startsAt: true, endsAt: true, _count: { select: { actions: true } } },
  });
  const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-dark-slate">Event</h1>
        <p className="mt-1 text-sm text-dark-slate/60">
          En kväll med QR-kod, till exempel presentationen 3 december. QR-länken leder till kvällens tre steg; storskärmen visar siffrorna live.
        </p>
      </div>

      <form action={createEvent} className="grid gap-3 rounded-xl border border-muted-teal/30 bg-white p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">Titel<input name="title" required maxLength={120} placeholder="GoodTribes-kväll 3 december" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Kod (i QR-länken)<input name="code" required maxLength={40} placeholder="dec3" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Börjar (valfritt)<input name="startsAt" type="datetime-local" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Slutar (valfritt)<input name="endsAt" type="datetime-local" className={input} /></label>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral/90">Skapa eller uppdatera</button>
          <p className="mt-1 text-xs text-dark-slate/50">Samma kod igen uppdaterar eventet.</p>
        </div>
      </form>

      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-muted-teal/30 bg-white p-4">
            <div>
              <p className="font-semibold text-dark-slate">{e.title}</p>
              <p className="text-xs text-dark-slate/60">
                <code>{APP_URL.replace(/^https?:\/\//, "")}/api/e/{e.code}</code> · {e._count.actions} händelser
                {e.startsAt && <> · {e.startsAt.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}</>}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link href={`/e/${e.code}`} className="rounded-lg border border-muted-teal/40 px-3 py-1.5 hover:border-coral">Kvällens sida</Link>
              <Link href={`/e/${e.code}/skarm`} className="rounded-lg bg-dark-slate px-3 py-1.5 text-white">Storskärm</Link>
            </div>
          </li>
        ))}
        {events.length === 0 && <li className="text-sm text-dark-slate/50">Inga event än.</li>}
      </ul>
    </div>
  );
}
