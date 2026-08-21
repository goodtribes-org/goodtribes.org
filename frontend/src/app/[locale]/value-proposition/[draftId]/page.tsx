export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import ValuePropositionDraftGrid from "./ValuePropositionDraftGrid";
import PromoteDraftForm from "./PromoteDraftForm";

export const metadata: Metadata = {
  title: "Värdeerbjudande — utkast — GoodTribes.org",
};

export default async function ValuePropositionDraftPage({
  params,
}: {
  params: Promise<{ draftId: string; locale: string }>;
}) {
  const { draftId, locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations({ locale, namespace: "ValuePropositionDraftPage" });

  const draft = await prisma.valuePropositionDraft.findUnique({
    where: { id: draftId },
    include: { promotedToProject: { select: { slug: true, title: true } }, owner: { select: { name: true } } },
  });
  // Open by design — anyone logged in can view and edit any not-yet-promoted
  // draft, same as Lean Canvas and Whiteboard drafts.
  if (!draft) notFound();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <Link href="/sandbox" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          {t("backToSandbox")}
        </Link>
        {draft.promotedToProject ? (
          <Link
            href={`/projects/${draft.promotedToProject.slug}/value-proposition`}
            className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors"
          >
            {t("viewLiveProject", { title: draft.promotedToProject.title })}
          </Link>
        ) : (
          <PromoteDraftForm draftId={draft.id} suggestedTitle={draft.name ?? draft.vpJobs?.slice(0, 60) ?? ""} />
        )}
      </div>

      <h1 className="text-xl font-bold text-dark-slate mb-1">{draft.name || t("draftHeading")}</h1>
      {draft.promotedToProject ? (
        <p className="text-sm text-dark-slate/50 mb-6">{t("alreadyPromotedNote")}</p>
      ) : (
        <p className="text-sm text-dark-slate/50 mb-6">
          {t("draftSubtitle", { name: draft.owner.name ?? t("unknownAuthor") })}
        </p>
      )}

      <ValuePropositionDraftGrid draftId={draft.id} canvas={draft} canEdit={!draft.promotedToProject} />
    </div>
  );
}
