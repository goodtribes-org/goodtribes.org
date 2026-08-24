import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";
import type { HeroSlideData } from "@/lib/heroSlides";

// Same mark as /public/img/goodtribes-mark.svg, inlined so it can render at
// any size without an extra image request. Colors are the mark's real
// originals — never recolored to a brand accent, per explicit design
// direction. Rendered as a normal (non-watermark) foreground graphic
// alongside the hero copy, per the approved mockup.
function LogoMark({ size }: { size: number }) {
  return (
    <svg viewBox="674 171 652 651" aria-hidden="true" style={{ width: size, height: size }}>
      <path fill="#12486C" d="M1206.46,290.49c-52.73-52.88-125.86-85.52-206.54-85.52c-39.74,0-77.51,7.86-111.81,22.06    c-35.51,14.66-67.69,36.41-94.73,63.46c-19.94,19.94-34.45,41.1-50.92,63.76c-6.95-9.07-13.45-18.58-19.64-28.4    c13.3-21.45,29.01-41.25,46.84-59.08c58.92-58.92,140.36-95.34,230.26-95.34c90.05,0,171.33,36.41,230.26,95.34    c17.83,17.83,33.54,37.62,46.84,59.08c-6.35,10.27-13.3,20.09-20.55,29.61C1240.16,330.83,1227.61,311.64,1206.46,290.49z" />
      <path fill="#12486C" d="M1061.42,324.78c0,33.99-27.5,61.49-61.49,61.49c-33.84,0-61.34-27.5-61.34-61.49    c0-33.84,27.5-61.34,61.34-61.34C1033.92,263.44,1061.42,290.94,1061.42,324.78z" />
      <path fill="#408147" d="M1214.17,443.54c-35.05,30.97-182.36,161.21-131.45,257.61c50.31-30.07,223.76-147.76,202.46-328.16    c-19.04,24.93-41.4,47.14-65.87,66.18L1214.17,443.54z" />
      <path fill="#408147" d="M1319.17,432.36c-15.11,150.33-146.56,250.96-205.63,289.03c39.13,13.45,111.2,23.87,162.87-52.13    c31.28-50.01,49.25-108.93,49.25-172.24C1325.67,474.97,1323.41,453.21,1319.17,432.36z" />
      <path fill="#0F6E95" d="M1115.81,494.61c-36.71,12.54-75.85-62.25-115.89-62.25c-39.89,0-79.02,74.79-115.73,62.25    c57.56,67.54,101.68,142.02,59.23,229.35l56.51,85.37l57.26-86.12C1008.08,646.3,1065.04,553.98,1115.81,494.61z" />
      <path fill="#408147" d="M917.28,701.15c50.92-96.39-96.55-226.63-131.6-257.61l-4.99-4.38c-24.63-18.89-46.84-41.1-66.03-66.33    C693.37,553.38,866.97,671.08,917.28,701.15z" />
      <path fill="#408147" d="M886.46,721.39c-59.08-38.07-190.67-138.7-205.78-289.03c-4.23,20.85-6.35,42.61-6.35,64.67    c0,63.31,17.98,122.23,49.1,172.24C775.1,745.26,847.32,734.84,886.46,721.39z" />
      <path fill="#12486C" d="M917.13,745.26c-20.4,9.07-60.28,23.27-104.25,18.43c44.57,31.43,97.45,51.82,154.71,57.41L917.13,745.26z" />
      <path fill="#12486C" d="M1082.87,745.26l-50.61,75.85c57.26-5.59,110.14-25.99,154.87-57.41    C1143.01,768.53,1103.12,754.33,1082.87,745.26z" />
    </svg>
  );
}

function HeroLogoColumn() {
  return (
    <div aria-hidden="true" className="hidden lg:flex flex-col items-center justify-center flex-shrink-0" style={{ width: 320, marginRight: 40 }}>
      <LogoMark size={240} />
      <p className="text-dark-slate" style={{ fontWeight: 600, fontSize: 44, letterSpacing: "-.01em", marginTop: 22 }}>
        GoodTribes
      </p>
    </div>
  );
}

function HeroBody({ html }: { html: string }) {
  if (html.trim().startsWith("<")) {
    return (
      <div
        className="prose prose-sm max-w-none text-dark-slate/70"
        style={{ fontSize: 17, lineHeight: 1.55, maxWidth: "46ch" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <p className="text-dark-slate/70" style={{ fontSize: 17, lineHeight: 1.55, maxWidth: "46ch" }}>
      {html}
    </p>
  );
}

export default async function HomeHero({
  locale,
  slide,
  canEdit,
}: {
  locale: Locale;
  slide: HeroSlideData | null;
  canEdit: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const heading = slide?.heading || t("heroDefaultHeading");
  const body = slide?.body || t("heroDefaultBody");

  return (
    <div className={`${homeSansFont.className} relative`}>
      <div className="max-w-[1160px] mx-auto px-8 relative flex items-center gap-10" style={{ padding: "76px 32px 26px" }}>
        {canEdit && (
          <Link
            href="/site-admin/hero-carousel"
            className="absolute top-3 right-3 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors"
          >
            ✎ {t("heroEditLink")}
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)", marginBottom: 18 }}>
            {t("heroEyebrow")}
          </p>
          <h1 className="text-dark-slate" style={{ fontWeight: 600, fontSize: 56, lineHeight: 1.05, letterSpacing: "-.025em", maxWidth: "15ch", textWrap: "balance" }}>
            {heading}
          </h1>
          <div style={{ marginTop: 26 }}>
            <HeroBody html={body} />
            <div className="flex gap-2.5" style={{ marginTop: 24 }}>
              <Link href="/projects/new" className="inline-flex items-center justify-center bg-coral text-white font-semibold rounded-lg hover:bg-dark-slate transition-colors" style={{ padding: "12px 22px", fontSize: 14.5 }}>
                {t("heroCtaPrimary")}
              </Link>
              <Link href="#projects" className="inline-flex items-center justify-center bg-white border border-muted-teal/40 text-dark-slate font-medium rounded-lg hover:border-coral transition-colors" style={{ padding: "12px 22px", fontSize: 14.5 }}>
                {t("heroCtaSecondary")}
              </Link>
            </div>
          </div>
        </div>
        <HeroLogoColumn />
      </div>
    </div>
  );
}
