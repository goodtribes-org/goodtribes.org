"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { toProxyUrl } from "@/lib/storageUrl";
import { heroTintClass } from "@/lib/heroTint";
import { handwritingFont } from "@/lib/fonts";
import { CARD_SHADOW, PHOTO_TILT } from "@/lib/heroCardStyle";
import type { HeroSlideData } from "@/lib/heroSlides";

// Content saved through the rich-text editor is HTML; content seeded before
// it was added is plain text. Detect which one we've got rather than forcing
// a data migration on old rows.
function RichText({ html, className }: { html: string; className: string }) {
  const trimmed = html.trim();
  if (trimmed.startsWith("<")) {
    return (
      <div
        className={`prose prose-sm max-w-none prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline prose-strong:text-coral ${className}`}
        style={{ fontSize: 14, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <p className={className} style={{ fontSize: 14, lineHeight: 1.5 }}>
      {html}
    </p>
  );
}

function TextCard({ slide, canEdit, t }: { slide: HeroSlideData; canEdit: boolean; t: (key: string) => string }) {
  return (
    <div className={`relative bg-white p-3 ${CARD_SHADOW}`}>
      {canEdit && (
        <Link
          href="/site-admin/hero-carousel"
          className="absolute top-3 right-3 z-10 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors bg-white/70 rounded-md px-2 py-1"
        >
          ✎ {t("editLink")}
        </Link>
      )}
      <div className={`md:overflow-y-auto border border-muted-teal/20 px-6 pt-3 pb-5 flex flex-col justify-start ${heroTintClass(slide.tintColor, slide.tintOpacity)}`}>
        <div className="flex flex-col items-start text-left">
          <h1 className={`${handwritingFont.className} text-dark-slate pr-16`} style={{ textWrap: "balance", fontSize: 26 }}>
            {slide.heading}
          </h1>
          <RichText html={slide.body} className="mt-1 text-dark-slate" />
          {slide.bodyLine2 && (
            <p className="mt-1 font-semibold text-dark-slate" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {slide.bodyLine2}
            </p>
          )}
          {slide.obstacles.length > 0 && (
            <>
              <ul className="mt-3 flex flex-col gap-2.5">
                {slide.obstacles.map((o) => (
                  <li key={o.lead} className="text-sm text-dark-slate">
                    <span className="font-bold text-seagrass">{o.lead}</span> {o.text}
                  </li>
                ))}
              </ul>
              {slide.outro && <RichText html={slide.outro} className="mt-3 text-dark-slate" />}
            </>
          )}
          {slide.points.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {slide.points.map((p) => (
                <li key={p.pct} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-right text-sm font-bold text-coral">{p.pct}</span>
                  <span className="text-sm text-dark-slate">{p.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ slide, tilt }: { slide: HeroSlideData; tilt: { rotate: number; x: number; y: number } }) {
  return (
    <div
      className="relative w-full"
      style={{
        aspectRatio: "16 / 10",
        transform: `rotate(${tilt.rotate}deg) translate(${tilt.x}px, ${tilt.y}px)`,
      }}
    >
      <div className={`absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
        <div className="relative h-full w-full overflow-hidden">
          <img src={toProxyUrl(slide.imageUrl)} alt={slide.alt} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

export default function HeroSlideText({
  slides,
  canEdit,
}: {
  slides: HeroSlideData[];
  canEdit: boolean;
}) {
  const t = useTranslations("HeroPhotoStack");

  if (slides.length === 0) return null;

  const [first, ...rest] = slides;

  return (
    <div className="flex flex-col gap-16">
      {/* Text till bilden som ligger kvar i hero */}
      <div className="flex justify-center px-4 pt-6">
        <div className="flex w-full max-w-6xl justify-center">
          <div className="w-full" style={{ maxWidth: 620 }}>
            <TextCard slide={first} canEdit={canEdit} t={t} />
          </div>
        </div>
      </div>

      {/* Resten av bilderna + deras texter, utanför hero — varje bild kant-till-kant med sin egen blurrade bakgrund, text under */}
      {rest.map((slide, i) => {
        const tilt = PHOTO_TILT[(i + 1) % PHOTO_TILT.length];
        return (
          <div key={slide.id} className="relative" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
            <div className="absolute inset-0 overflow-hidden">
              <img src={toProxyUrl(slide.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
            </div>
            <div className="relative z-10 flex justify-center px-4 py-10">
              <div className="flex w-full flex-col items-center gap-6" style={{ maxWidth: 620 }}>
                <div className="w-full">
                  <PhotoCard slide={slide} tilt={tilt} />
                </div>
                <div className="w-full">
                  <TextCard slide={slide} canEdit={canEdit} t={t} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
