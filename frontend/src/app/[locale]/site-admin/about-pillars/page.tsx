import { getTranslations } from "next-intl/server";
import { getAboutPillarsDraft } from "@/lib/aboutPillars";
import AboutPillarsEditor from "@/components/AboutPillarsEditor";
import type { AboutPillarsInput } from "../../about-pillars-actions";
import type { Locale } from "next-intl";

const EMPTY: AboutPillarsInput = {
  levaGottHeading: "",
  levaGottBody: "",
  maGottHeading: "",
  maGottBody: "",
  goraGottHeading: "",
  goraGottBody: "",
  dreamGoodHeading: "",
  dreamGoodBody: "",
};

export default async function AboutPillarsAdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [draft, t] = await Promise.all([
    getAboutPillarsDraft(locale),
    getTranslations({ locale, namespace: "AboutPillarsAdminPage" }),
  ]);

  const initialData: AboutPillarsInput = draft
    ? {
        levaGottHeading: draft.levaGottHeading,
        levaGottBody: draft.levaGottBody,
        maGottHeading: draft.maGottHeading,
        maGottBody: draft.maGottBody,
        goraGottHeading: draft.goraGottHeading,
        goraGottBody: draft.goraGottBody,
        dreamGoodHeading: draft.dreamGoodHeading,
        dreamGoodBody: draft.dreamGoodBody,
      }
    : EMPTY;

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dark-slate mb-1">{t("heading", { locale: locale.toUpperCase() })}</h1>
        <p className="text-sm text-dark-slate/50">{t("intro")}</p>
      </div>

      <AboutPillarsEditor initialData={initialData} locale={locale} />
    </div>
  );
}
