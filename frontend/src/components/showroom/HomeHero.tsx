import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { siteSansFont, heroTaglineFont } from "@/lib/fonts";
import type { HeroSlideData } from "@/lib/heroSlides";
import LogoMark from "@/components/LogoMark";

// Deliberately bleeds a little past the hero's own box on both ends — the
// top tucks slightly behind the site header above, the bottom tucks
// slightly behind the Vision/Mission/Mål cards below — per explicit design
// direction. Taken out of flow (absolute) so it no longer stretches the
// hero's height. It has no z-index of its own (stays at the default stack
// level 0), while SiteHeader (z-30) and VisionMissionGoal (z-10) each
// establish their own stacking context above that — that's what lets their
// opaque backgrounds paint over the logo instead of the other way around.
// A negative z-index here would instead sink it below <body>'s own
// background (both html and body set an explicit bg-color, so body's is a
// normal painted background, not the propagated canvas one) and hide it
// completely.
function HeroLogoColumn() {
  return (
    <div aria-hidden="true" className="hidden lg:flex flex-col items-center absolute" style={{ top: -57, right: 128 }}>
      <LogoMark size={480} />
    </div>
  );
}

// Underlines the heading's last word in coral, trailing punctuation (e.g. the
// "." in "...verkliga.") kept outside the underline — matches how the same
// "verkliga" callout is already styled (as a coral-colored span) in the
// site footer's echo of this heading.
function HeroHeading({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const lastWord = words.pop() ?? "";
  const rest = words.join(" ");
  const [, core, trailingPunct] = lastWord.match(/^(.*?)([.!?]*)$/) ?? [, lastWord, ""];

  return (
    <>
      {rest ? `${rest} ` : ""}
      <span style={{ textDecoration: "underline", textDecorationColor: "var(--color-coral)", textDecorationThickness: 5, textUnderlineOffset: 8 }}>
        {core}
      </span>
      {trailingPunct}
    </>
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
  copy,
}: {
  locale: Locale;
  slide: HeroSlideData | null;
  canEdit: boolean;
  copy: Record<string, string>;
}) {
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const heading = slide?.heading || t("heroDefaultHeading");
  const body = slide?.body || t("heroDefaultBody");
  const eyebrow = copy["HomePage.heroEyebrow"] ?? t("heroEyebrow");
  const editLink = copy["HomePage.heroEditLink"] ?? t("heroEditLink");
  const ctaPrimary = copy["HomePage.heroCtaPrimary"] ?? t("heroCtaPrimary");
  const ctaSecondary = copy["HomePage.heroCtaSecondary"] ?? t("heroCtaSecondary");

  return (
    <div className={`${siteSansFont.className} relative`}>
      <div className="relative flex items-center gap-10" style={{ paddingTop: 32, paddingBottom: 12 }}>
        {canEdit && (
          <Link
            href="/site-admin/hero-carousel"
            className="absolute top-3 right-3 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors"
          >
            ✎ {editLink}
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <p className={heroTaglineFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)", marginBottom: 18 }}>
            {eyebrow}
          </p>
          <h1 className={`text-dark-slate ${heroTaglineFont.className}`} style={{ fontWeight: 400, fontSize: 56, lineHeight: 1.15, maxWidth: "15ch", textWrap: "balance" }}>
            <HeroHeading text={heading} />
          </h1>
          <div style={{ marginTop: 26 }}>
            <HeroBody html={body} />
            <div className="flex gap-2.5" style={{ marginTop: 24 }}>
              <Link href="/projects/new" className="inline-flex items-center justify-center bg-coral text-white font-semibold rounded-lg hover:bg-dark-slate transition-colors" style={{ padding: "12px 22px", fontSize: 14.5 }}>
                {ctaPrimary}
              </Link>
              <Link href="#projects" className="inline-flex items-center justify-center bg-white border border-muted-teal/40 text-dark-slate font-medium rounded-lg hover:border-coral transition-colors" style={{ padding: "12px 22px", fontSize: 14.5 }}>
                {ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
        <HeroLogoColumn />
      </div>
    </div>
  );
}
