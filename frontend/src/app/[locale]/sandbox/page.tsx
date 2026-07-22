export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sandbox — GoodTribes.org",
  description: "Ett experimentellt område som blandar AI-genererat innehåll med användarbidrag.",
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just nu";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} tim sedan`;
  return `${Math.floor(h / 24)} dagar sedan`;
}

export default async function SandboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rooms = await prisma.room.findMany({
    where: { type: "IDEA_THREAD", projectId: null, isSandbox: true },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      _count: { select: { participants: true, messages: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-amber-900">🧪 Sandbox — experimentell zon</p>
        <p className="text-xs text-amber-800 mt-1">
          Här blandas AI-genererade problemställningar fritt med riktiga användarbidrag, och nya plattformsfunktioner
          testas innan de lanseras brett. Allt här kan vara AI-genererat, halvfärdigt eller under test — vem som
          helst kan gaffla ett bidrag till ett eget, fristående projekt utan tillstånd.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">Sandbox</h1>
          <p className="text-sm text-dark-slate/50 mt-1">
            Bolla vidare på ett AI-frö, eller posta ditt eget — samma idéverkstad-flöde, bara friare.
          </p>
        </div>
        <Link
          href="/ideaverkstad/new"
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors flex-shrink-0"
        >
          + Ny tråd
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-16 text-center">
          <p className="text-dark-slate/40 text-sm">Inga trådar ännu — nya AI-fröer tillkommer löpande.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/ideaverkstad/${room.id}`}
              className="flex items-center justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
            >
              <div className="min-w-0">
                <p className="font-medium text-dark-slate truncate">
                  {room.origin === "AI_SEED" && <span className="text-amber-600 mr-1">🤖</span>}
                  {room.name ?? "Namnlös tråd"}
                </p>
                <p className="text-xs text-dark-slate/40 mt-0.5">
                  {room._count.participants} deltagare · {room._count.messages} inlägg · senast aktiv {timeAgo(room.lastMessageAt)}
                </p>
              </div>
              <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
