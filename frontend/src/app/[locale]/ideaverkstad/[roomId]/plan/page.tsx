export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getRoomAccess } from "@/lib/roomAuth";
import PlanReviewActions from "./PlanReviewActions";

export const metadata: Metadata = {
  title: "Planförslag — Idéverkstaden",
};

type PlanJson = {
  project: { title: string; summary: string; description: string; category: string; tags: string[]; sdgGoals: number[] };
  leanCanvas: Record<string, string>;
  valueProposition: Record<string, string>;
  initialTasks: { title: string; description: string }[];
};

const LEAN_CANVAS_LABELS: Record<string, string> = {
  purpose: "Syfte", impact: "Impact", jobsToBeDone: "Jobs to be done", solution: "Lösning",
  keyMetrics: "Nyckeltal", uniqueValueProposition: "Unikt värdeerbjudande", unfairAdvantage: "Fördel",
  channels: "Kanaler", customerSegments: "Kundsegment", costStructure: "Kostnader", revenueStreams: "Intäkter",
  // Plans generated before the switch to Social Lean Canvas.
  problem: "Problem", alternatives: "Alternativ idag", concept: "Koncept", earlyAdopters: "Tidiga användare",
};

const VALUE_PROP_LABELS: Record<string, string> = {
  vpJobs: "Kundens jobb", vpPains: "Kundens smärtpunkter", vpGains: "Kundens vinster",
  vpProducts: "Produkter & tjänster", vpRelievers: "Smärtlindrare", vpCreators: "Vinstskapare",
};

export default async function AiProjectPlanPage({
  params,
}: {
  params: Promise<{ roomId: string; locale: string }>;
}) {
  const { roomId } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) redirect("/login");

  const access = await getRoomAccess(roomId, userId);
  if (!access || access.room.type !== "AI_INTAKE" || !access.canRead) notFound();

  const planRow = await prisma.aiProjectPlan.findUnique({ where: { roomId } });
  if (!planRow) notFound();

  const plan = planRow.planJson as unknown as PlanJson;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/ideaverkstad/${roomId}`} className="text-sm text-dark-slate/50 hover:text-dark-slate">
        ← Tillbaka till dialogen
      </Link>
      <h1 className="text-xl font-bold text-dark-slate mt-1 mb-1">Planförslag</h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        Granska vad AI föreslår innan något skapas på riktigt. Inget sparas förrän du godkänner.
      </p>

      {planRow.status !== "pending" && (
        <div className="border border-seagrass/30 bg-seagrass/5 rounded-lg p-4 mb-6 text-sm">
          {planRow.status === "approved"
            ? "Den här planen är redan godkänd och projektet skapat."
            : "Den här planen avvisades."}
        </div>
      )}

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Projekt</h2>
        <div className="border border-muted-teal/40 rounded-lg p-4 bg-white space-y-1">
          <p className="font-medium text-dark-slate">{plan.project.title || "(Ingen titel föreslagen)"}</p>
          {plan.project.summary && <p className="text-sm text-dark-slate/70">{plan.project.summary}</p>}
          {plan.project.sdgGoals.length > 0 && (
            <p className="text-xs text-dark-slate/40">SDG: {plan.project.sdgGoals.join(", ")}</p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Lean Canvas</h2>
        <div className="border border-muted-teal/40 rounded-lg p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(LEAN_CANVAS_LABELS).map(([key, label]) => (
            plan.leanCanvas[key] ? (
              <div key={key}>
                <p className="text-xs font-medium text-dark-slate/50">{label}</p>
                <p className="text-sm text-dark-slate/80">{plan.leanCanvas[key]}</p>
              </div>
            ) : null
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Värdeerbjudande</h2>
        <div className="border border-muted-teal/40 rounded-lg p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(VALUE_PROP_LABELS).map(([key, label]) => (
            plan.valueProposition[key] ? (
              <div key={key}>
                <p className="text-xs font-medium text-dark-slate/50">{label}</p>
                <p className="text-sm text-dark-slate/80">{plan.valueProposition[key]}</p>
              </div>
            ) : null
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">Första uppgifter</h2>
        {plan.initialTasks.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga förslag på uppgifter.</p>
        ) : (
          <ul className="border border-muted-teal/40 rounded-lg bg-white divide-y divide-muted-teal/20">
            {plan.initialTasks.map((t, i) => (
              <li key={i} className="p-3">
                <p className="text-sm font-medium text-dark-slate">{t.title}</p>
                {t.description && <p className="text-xs text-dark-slate/50 mt-0.5">{t.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {planRow.status === "pending" && (
        <PlanReviewActions planId={planRow.id} roomId={roomId} revisionCount={planRow.revisionCount} />
      )}
    </div>
  );
}
