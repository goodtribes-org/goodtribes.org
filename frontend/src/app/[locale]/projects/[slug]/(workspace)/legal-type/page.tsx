export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isRealMember } from "@/lib/authz";
import { LEGAL_TYPES, LEGAL_TYPE_LABEL } from "@/lib/legalType";
import { proposeLegalTypeChange } from "./actions";

export const metadata: Metadata = {
  title: "Juridisk form — GoodTribes.org",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Väntar på omröstning",
  approved_by_members: "Godkänt av medlemmarna — väntar på Stiftelsen",
  rejected_by_members: "Avslaget av medlemmarna",
  executed: "Genomfört",
  rejected_by_foundation: "Avslaget av Stiftelsen",
};

export default async function LegalTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true, legalType: true, commercialUmbrellaEntity: { select: { name: true } } },
  });
  if (!project) notFound();

  const [pendingRequest, isMember] = await Promise.all([
    prisma.legalTypeChangeRequest.findFirst({
      where: { projectId: project.id, status: { in: ["pending", "approved_by_members"] } },
      orderBy: { createdAt: "desc" },
    }),
    userId ? isRealMember(project.id, userId) : Promise.resolve(false),
  ]);

  const otherTypes = LEGAL_TYPES.filter((t) => t.value !== project.legalType);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/projects/${slug}`} className="text-sm text-dark-slate/50 hover:text-seagrass">
          ← {project.title}
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">Juridisk form</h1>
        <p className="text-sm text-dark-slate/50 mt-1">Se PRD 4c för vad varje form innebär juridiskt.</p>
      </div>

      <section className="border border-muted-teal/40 rounded-lg p-5 bg-white mb-6">
        <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">Nuvarande form</p>
        <p className="text-lg font-medium text-dark-slate">{LEGAL_TYPE_LABEL[project.legalType] ?? project.legalType}</p>
        {project.commercialUmbrellaEntity && (
          <p className="text-sm text-dark-slate/50 mt-1">Produktlinje under {project.commercialUmbrellaEntity.name}</p>
        )}
      </section>

      {pendingRequest ? (
        <section className="border border-amber-300 bg-amber-50 rounded-lg p-5">
          <p className="text-sm font-medium text-dark-slate mb-1">
            Begäran om byte till {LEGAL_TYPE_LABEL[pendingRequest.requestedType] ?? pendingRequest.requestedType}
          </p>
          <p className="text-sm text-amber-800">{STATUS_LABEL[pendingRequest.status] ?? pendingRequest.status}</p>
          {pendingRequest.pollId && (
            <Link
              href={`/projects/${slug}/polls/${pendingRequest.pollId}`}
              className="inline-block mt-2 text-sm text-seagrass hover:underline font-medium"
            >
              Se omröstningen →
            </Link>
          )}
        </section>
      ) : isMember ? (
        <section className="border border-muted-teal/40 rounded-lg p-5 bg-white">
          <p className="text-sm font-medium text-dark-slate mb-3">Föreslå ändring</p>
          <p className="text-xs text-dark-slate/50 mb-3">
            Skapar en Tribe Token-viktad omröstning bland projektets medlemmar. Ett godkänt röstresultat är en
            begäran — Stiftelsen genomför den faktiska övergången (PRD 4c).
          </p>
          <form action={proposeLegalTypeChange.bind(null, project.id, slug)} className="flex flex-col gap-3">
            <select
              name="requestedType"
              className="border border-muted-teal rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              {otherTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
            >
              Starta omröstning
            </button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-dark-slate/40">Endast projektmedlemmar kan föreslå en ändring.</p>
      )}
    </div>
  );
}
