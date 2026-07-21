import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isLeadRole } from "@/lib/authz";
import ProposePartnershipForm from "./ProposePartnershipForm";
import PartnershipActions from "@/components/PartnershipActions";
import ProposeMatchButton from "@/components/ProposeMatchButton";
import { findMatchingOrgsForProject } from "@/lib/partnershipMatching";

export default async function ProjectPartnershipsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { where: { userId }, select: { role: true } } },
  });
  if (!project) notFound();

  const isLead = project.members.some((m) => isLeadRole(m.role));
  if (!isLead) redirect(`/projects/${slug}`);

  const partnerships = await prisma.partnership.findMany({
    where: { projectId: project.id },
    include: { organisation: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pending = partnerships.filter((p) => p.status === "pending");
  const active = partnerships.filter((p) => p.status === "active");
  const other = partnerships.filter((p) => p.status !== "pending" && p.status !== "active");

  const matches = await findMatchingOrgsForProject(project.id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-dark-slate mb-6">Partnerskap</h1>

      <div className="border border-dashed border-muted-teal/50 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-dark-slate mb-1">Föreslå ett partnerskap</h2>
        <p className="text-sm text-dark-slate/50 mb-4">
          Ange slug för organisationen ni vill knyta till er som partner.
        </p>
        <ProposePartnershipForm projectSlug={slug} />
      </div>

      {matches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
            Organisationer som kan vara partners
          </h2>
          <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
            {matches.map((m) => (
              <div key={m.slug} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/org/${m.slug}`} className="text-sm font-medium text-seagrass hover:underline">
                    {m.name}
                  </Link>
                  {m.category && <p className="text-xs text-dark-slate/40">{m.category}</p>}
                </div>
                <ProposeMatchButton side="project" organisationSlug={m.slug} projectSlug={slug} />
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Väntande</h2>
          <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/org/${p.organisation.slug}`} className="text-sm font-medium text-seagrass hover:underline">
                    {p.organisation.name}
                  </Link>
                  <p className="text-xs text-dark-slate/40">
                    {p.proposedBy === "project" ? "Väntar på organisationens svar" : "Väntar på ert svar"} · {p.type}
                  </p>
                </div>
                {p.proposedBy === "org" && <PartnershipActions partnershipId={p.id} mode="respond" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Aktiva</h2>
          <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
            {active.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/org/${p.organisation.slug}`} className="text-sm font-medium text-seagrass hover:underline">
                    {p.organisation.name}
                  </Link>
                  <p className="text-xs text-dark-slate/40">{p.type}</p>
                </div>
                <PartnershipActions partnershipId={p.id} mode="revoke" />
              </div>
            ))}
          </div>
        </section>
      )}

      {other.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Historik</h2>
          <div className="divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
            {other.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-dark-slate/60">{p.organisation.name}</span>
                <span className="text-xs text-dark-slate/40">
                  {p.status === "declined" ? "Avvisad" : "Återkallad"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
