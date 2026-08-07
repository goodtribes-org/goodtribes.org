import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createGuide } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AcademyNewPage" });
  return { title: t("metadataTitle") };
}

const CATEGORY_VALUES = ["Projektledning", "Crowdfunding", "Community", "Teknik", "Impact"];

export default async function NewGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AcademyNewPage" });

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const CATEGORY_LABELS: Record<string, string> = {
    Projektledning: t("categoryProjectManagement"),
    Crowdfunding: t("categoryCrowdfunding"),
    Community: t("categoryCommunity"),
    Teknik: t("categoryTech"),
    Impact: t("categoryImpact"),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate mb-1">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60">{t("subheading")}</p>
      </div>

      <form action={createGuide} className="flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-dark-slate">
            {t("titleLabel")} <span className="text-coral">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder={t("titlePlaceholder")}
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-dark-slate">
            {t("categoryLabel")} <span className="text-coral">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 bg-white"
          >
            <option value="">{t("categoryPlaceholder")}</option>
            {CATEGORY_VALUES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="difficulty" className="text-sm font-medium text-dark-slate">
            {t("difficultyLabel")}
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue="beginner"
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 bg-white"
          >
            <option value="beginner">{t("difficultyBeginner")}</option>
            <option value="avancerad">{t("difficultyAdvanced")}</option>
          </select>
        </div>

        {/* Read time */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="readTimeMinutes" className="text-sm font-medium text-dark-slate">
            {t("readTimeLabel")}
          </label>
          <input
            id="readTimeMinutes"
            name="readTimeMinutes"
            type="number"
            min={1}
            max={120}
            defaultValue={5}
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 w-32"
          />
        </div>

        {/* Body markdown */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bodyMarkdown" className="text-sm font-medium text-dark-slate">
            {t("bodyLabel")} <span className="text-coral">*</span>
          </label>
          <textarea
            id="bodyMarkdown"
            name="bodyMarkdown"
            required
            rows={16}
            placeholder={t("bodyPlaceholder")}
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 resize-y font-mono"
          />
          <p className="text-xs text-dark-slate/40">{t("markdownHelp")}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-coral text-white font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            {t("submitButton")}
          </button>
          <a
            href="/academy"
            className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
          >
            {t("cancelLink")}
          </a>
        </div>
      </form>
    </div>
  );
}
