import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { reviewLeadDays } from "@/lib/fundingCalls/review";
import ReviewControls from "./ReviewControls";

const dateFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Stockholm" });
const DAY = 86_400_000;

// GoodTribes' review queue (#346): applications to be submitted in one of
// its entities' names. 1 the completeness check (done when the team sent
// it), 2 identity and roles, 3 the decision. Soonest deadline first.
export default async function ApplicationsReviewPage() {
  const [waiting, decided] = await Promise.all([
    prisma.fundingApplication.findMany({
      where: { status: "in_review" },
      orderBy: { deadline: { sort: "asc", nulls: "last" } },
      include: {
        project: { select: { slug: true, title: true, members: { where: { role: { not: "FOLLOWER" } }, select: { role: true, user: { select: { name: true, email: true } } } } } },
        fundingCall: { select: { slug: true, title: true, requirements: true, amountMaxSek: true, cofunding: true, fundingSource: { select: { name: true } } } },
        applicantEntity: { select: { name: true, kind: true } },
        reviews: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { name: true } } } },
      },
    }),
    prisma.applicationReview.findMany({
      where: { level: "HUMAN" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { reviewer: { select: { name: true } }, application: { select: { project: { select: { title: true, slug: true } }, fundingCall: { select: { title: true } } } } },
    }),
  ]);
  const lead = reviewLeadDays();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-dark-slate">Ansökningar att granska</h1>
      <p className="mt-1 text-sm text-dark-slate/60">
        Ansökningar som ska lämnas in i en GoodTribes-enhets namn. GoodTribes tar då ett juridiskt och ekonomiskt ansvar, så ingen sådan ansökan kan markeras som inlämnad utan ett godkännande här. Ansökan ska komma in minst {lead} dagar före finansiärens deadline.
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">Väntar ({waiting.length})</h2>
      {waiting.length === 0 ? (
        <p className="mt-3 text-sm text-dark-slate/40">Inget väntar.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {waiting.map((a) => {
            const daysLeft = a.deadline ? Math.ceil((a.deadline.getTime() - Date.now()) / DAY) : null;
            const check = a.reviews.find((r) => r.level === "CHECK");
            const identity = a.reviews.find((r) => r.level === "IDENTITY" && r.result === "OK");
            return (
              <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-muted-teal/30 bg-white p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">
                    {a.fundingCall?.fundingSource.name} · sökande {a.applicantEntity?.name ?? "—"}
                    {daysLeft !== null && ` · ${daysLeft} dagar till deadline`}
                  </p>
                  <p className="mt-1 font-semibold text-dark-slate">
                    <Link href={`/projects/${a.project.slug}`} className="hover:underline">{a.project.title}</Link>
                    {" → "}
                    {a.fundingCall?.slug ? <Link href={`/utlysningar/${a.fundingCall.slug}`} className="hover:underline">{a.fundingCall.title}</Link> : a.fundingCall?.title}
                  </p>
                  <p className="text-xs text-dark-slate/55">
                    Söker {a.amountRequestedSek?.toLocaleString("sv-SE") ?? "?"} kr{a.fundingCall?.amountMaxSek ? ` (högst ${a.fundingCall.amountMaxSek.toLocaleString("sv-SE")} kr)` : ""}
                    {a.deadline && ` · deadline ${dateFmt.format(a.deadline)}`}
                    {a.cofundingNote && ` · medfinansiering: ${a.cofundingNote}`}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-dark-slate">{check?.result === "OK" ? "✓ " : ""}1. Kontroll av ansökans delar</p>
                  {(a.fundingCall?.requirements ?? []).length > 0 && (
                    <ul className="mt-1 text-xs text-dark-slate/70">
                      {a.fundingCall!.requirements.map((r) => <li key={r}>{a.requirementsDone.includes(r) ? "☑" : "☐"} {r}</li>)}
                    </ul>
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-dark-slate">Teamet</p>
                  <ul className="mt-1 text-xs text-dark-slate/70">
                    {a.project.members.map((m, i) => <li key={i}>{m.user.name ?? m.user.email} · {m.role}</li>)}
                  </ul>
                  {identity && <p className="mt-1 text-xs text-dark-slate/55">Identitet: {identity.motivation} ({identity.reviewer?.name})</p>}
                </div>
                <ReviewControls applicationId={a.id} identityDone={!!identity} />
              </div>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">Senaste besluten</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {decided.map((d) => (
              <li key={d.id} className="rounded-lg border border-muted-teal/25 bg-white px-4 py-2">
                <span className="font-semibold">{d.result === "OK" ? "Godkänd" : d.result === "CHANGES" ? "Ändringar begärda" : "Avslagen"}</span>
                {" · "}{d.application.project.title} → {d.application.fundingCall?.title}
                <span className="text-xs text-dark-slate/50"> · {d.reviewer?.name} {dateFmt.format(d.createdAt)}</span>
                {d.motivation && <p className="text-xs text-dark-slate/65">{d.motivation}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
