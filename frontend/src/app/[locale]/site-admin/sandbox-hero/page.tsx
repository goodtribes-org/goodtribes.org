import { getTranslations } from "next-intl/server";
import { getSandboxHeroDraft } from "@/lib/sandboxHero";
import SandboxHeroEditor from "@/components/SandboxHeroEditor";
import type { SandboxHeroInput } from "../../sandbox-hero-actions";
import type { Locale } from "next-intl";

const EMPTY: SandboxHeroInput = {
  heroKicker: "",
  heroDescription: "",
  levaGottHeading: "",
  levaGottBody: "",
  maGottHeading: "",
  maGottBody: "",
  goraGottHeading: "",
  goraGottBody: "",
  dreamGoodHeading: "",
  dreamGoodBody: "",
};

export default async function SandboxHeroAdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [draft, t] = await Promise.all([
    getSandboxHeroDraft(locale),
    getTranslations({ locale, namespace: "SandboxHeroAdminPage" }),
  ]);

  const initialData: SandboxHeroInput = draft
    ? {
        heroKicker: draft.heroKicker,
        heroDescription: draft.heroDescription,
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

      <SandboxHeroEditor initialData={initialData} locale={locale} />
    </div>
  );
}
