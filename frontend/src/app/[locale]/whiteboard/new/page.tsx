export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createWhiteboardDraft } from "../actions";
import NewDraftForm from "@/components/NewDraftForm";

export const metadata: Metadata = {
  title: "Ny whiteboard — GoodTribes.org",
};

export default async function NewWhiteboardDraftPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations({ locale, namespace: "WhiteboardDraftPage" });

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <h1 className="text-2xl font-bold text-dark-slate mb-2">{t("newHeading")}</h1>
      <p className="text-sm text-dark-slate/50 mb-6">{t("newSubtitle")}</p>
      <NewDraftForm
        action={createWhiteboardDraft}
        nameLabel={t("nameLabel")}
        namePlaceholder={t("namePlaceholder")}
        submitLabel={t("newCta")}
      />
      <Link href="/sandbox" className="block mt-4 text-xs text-dark-slate/40 hover:underline">
        {t("backToSandbox")}
      </Link>
    </div>
  );
}
