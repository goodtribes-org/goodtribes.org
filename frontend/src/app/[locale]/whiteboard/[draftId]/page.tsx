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
    include: { promotedToProject: { select: { slug: true, title: true } }, owner: { select: { name: true } } },
  });
  // Open by design — anyone logged in can view and draw on any
  // not-yet-promoted whiteboard draft, same as Idéverkstaden's project-less
  // threads. No ownerId check here; see actions.ts for the same openness on
  // the write side.
  if (!draft) notFound();

  return (
    <div className="relative -mt-8 -mb-12" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-amber-200 bg-amber-50/40 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/sandbox" className="text-sm text-dark-slate/50 hover:text-dark-slate flex-shrink-0">
            {t("backToSandbox")}
          </Link>
          <p className="text-xs text-dark-slate/40 truncate hidden sm:block">
            {draft.promotedToProject ? t("alreadyPromotedNote") : t("draftSubtitle", { name: draft.owner.name ?? t("unknownAuthor") })}
          </p>
        </div>
        {draft.promotedToProject ? (
          <Link
            href={`/projects/${draft.promotedToProject.slug}/sprints`}
            className="px-3 py-1.5 text-xs font-medium rounded bg-coral text-white hover:bg-watermelon transition-colors flex-shrink-0"
          >
            {t("viewLiveProject", { title: draft.promotedToProject.title })}
          </Link>
        ) : (
          <PromoteWhiteboardForm draftId={draft.id} />
        )}
      </div>

      <WhiteboardDraftCanvas
        draftId={draft.id}
        initialDocumentState={draft.documentState}
        initialVersion={draft.version}
        canEdit={!draft.promotedToProject}
      />
    </div>
  );
}
