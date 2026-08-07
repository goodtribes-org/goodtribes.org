import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import NewIdeaThreadForm from "./NewIdeaThreadForm";

export const metadata: Metadata = {
  title: "Ny idésession — Idéverkstaden",
};

export default async function NewIdeaThreadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const t = await getTranslations("NewIdeaThreadPage");

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-slate mb-1">{t("heading")}</h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        {t("subtitle")}
      </p>
      <NewIdeaThreadForm />
    </div>
  );
}
