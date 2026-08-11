import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import NewPollForm from "./NewPollForm";
import type { Locale } from "next-intl";

export default async function NewPollPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "NewPollPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <a
          href={`/projects/${slug}/polls`}
          className="text-sm text-dark-slate/50 hover:text-seagrass"
        >
          {t("backToPolls")}
        </a>
        <h1 className="text-2xl font-bold mt-1">{t("heading")}</h1>
      </div>
      <NewPollForm slug={slug} />
    </div>
  );
}
