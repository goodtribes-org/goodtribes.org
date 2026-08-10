export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import WhiteboardDraftCanvas from "./WhiteboardDraftCanvas";
import PromoteWhiteboardForm from "./PromoteWhiteboardForm";

export const metadata: Metadata = {
  title: "Whiteboard — utkast — GoodTribes.org",
};

export default async function WhiteboardDraftPage({
  params,
}: {
  params: Promise<{ draftId: string; locale: string }>;
}) {
  const { draftId, locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations({ locale, namespace: "WhiteboardDraftPage" });

  const draft = await prisma.whiteboardDraft.findUnique({
    where: { id: draftId },
    include: { promotedToProject: { select: { slug: true, title: true } } },
  });
  if (!draft || draft.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <Link href="/sandbox" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          {t("backToSandbox")}
        </Link>
        {draft.promotedToProject ? (
          <Link
            href={`/projects/${draft.promotedToProject.slug}/sprints`}
            className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors"
          >
            {t("viewLiveProject", { title: draft.promotedToProject.title })}
          </Link>
        ) : (
          <PromoteWhiteboardForm draftId={draft.id} />
        )}
      </div>

      <h1 className="text-xl font-bold text-dark-slate mb-1">{t("draftHeading")}</h1>
      <p className="text-sm text-dark-slate/50 mb-4">
        {draft.promotedToProject ? t("alreadyPromotedNote") : t("draftSubtitle")}
      </p>

      <WhiteboardDraftCanvas
        draftId={draft.id}
        initialDocumentState={draft.documentState}
        initialVersion={draft.version}
        canEdit={!draft.promotedToProject}
      />
    </div>
  );
}
