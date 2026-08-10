export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createWhiteboardDraft } from "../actions";

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
      <form action={createWhiteboardDraft}>
        <button
          type="submit"
          className="px-5 py-2.5 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
        >
          {t("newCta")}
        </button>
      </form>
      <Link href="/sandbox" className="block mt-4 text-xs text-dark-slate/40 hover:underline">
        {t("backToSandbox")}
      </Link>
    </div>
  );
}
