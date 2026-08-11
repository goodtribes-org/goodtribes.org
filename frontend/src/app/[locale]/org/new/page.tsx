import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import NewOrgForm from "./NewOrgForm";
import type { Locale } from "next-intl";

export default async function NewOrgPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewOrgPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">{t("heading")}</h1>
      <p className="text-dark-slate/70 mb-8">{t("intro")}</p>
      <NewOrgForm />
    </div>
  );
}
