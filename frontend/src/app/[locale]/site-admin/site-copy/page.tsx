import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getSiteCopyMap } from "@/lib/siteCopy";
import { SITE_COPY_SECTIONS } from "@/lib/siteCopyFields";
import { saveSiteCopy } from "./actions";

export default async function SiteCopyAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const [copy, t, tField] = await Promise.all([
    getSiteCopyMap(locale),
    getTranslations({ locale, namespace: "SiteCopyAdminPage" }),
    getTranslations({ locale }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-xl font-bold text-dark-slate">{t("heading", { locale: locale.toUpperCase() })}</h1>
        <div className="flex gap-1 text-xs">
          <Link href="/site-admin/site-copy" locale="sv" className={`px-2 py-1 rounded-md border ${locale === "sv" ? "bg-dark-slate text-white border-dark-slate" : "border-muted-teal/40 text-dark-slate/60"}`}>
            {t("localeSv")}
          </Link>
          <Link href="/site-admin/site-copy" locale="en" className={`px-2 py-1 rounded-md border ${locale === "en" ? "bg-dark-slate text-white border-dark-slate" : "border-muted-teal/40 text-dark-slate/60"}`}>
            {t("localeEn")}
          </Link>
        </div>
      </div>
      <p className="text-sm text-dark-slate/50 mb-8">{t("intro")}</p>

      <form action={saveSiteCopy.bind(null, locale)} className="space-y-10">
        {SITE_COPY_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-dark-slate mb-3 pb-2 border-b border-muted-teal/20">{section.title}</h2>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key} className="block text-xs font-medium text-dark-slate/60 mb-1">
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      id={field.key}
                      name={field.key}
                      rows={3}
                      defaultValue={copy[field.key] ?? tField(field.key)}
                      className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40 resize-y"
                    />
                  ) : (
                    <input
                      id={field.key}
                      name={field.key}
                      type="text"
                      defaultValue={copy[field.key] ?? tField(field.key)}
                      className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-muted-teal/20 py-4 flex justify-end">
          <button
            type="submit"
            className="text-sm font-medium px-5 py-2.5 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors"
          >
            {t("saveButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
