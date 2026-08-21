import Link from "next/link";
import { toProxyUrl } from "@/lib/storageUrl";
import { heroTintClass } from "@/lib/heroTint";
import { handwritingFont } from "@/lib/fonts";
import { CARD_SHADOW } from "@/lib/heroCardStyle";
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

export default function HeroSlideRow({
  slide,
  tilt,
  canEdit,
  editLinkLabel,
}: {
  slide: HeroSlideData;
  tilt: { rotate: number; x: number; y: number };
  canEdit: boolean;
  editLinkLabel: string;
}) {
  return (
    <div className="grid w-full gap-4 items-center md:grid-cols-2">
      {/* Bild — till vänster. z-20 + textrutans negativa marginal (nedan) drar
          in ett par tior pixlar av textrutan under bildrutans kant, som ett
          par foton slarvigt lagda ovanpå varandra. */}
      <div
        className="relative z-20 w-full md:max-w-[620px] aspect-[16/10]"
        style={{
          transform: `rotate(${tilt.rotate}deg) translate(${tilt.x}px, ${tilt.y}px)`,
        }}
      >
        <div className={`relative h-full overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
          <div className="relative h-full w-full overflow-hidden">
            <img src={toProxyUrl(slide.imageUrl)} alt={slide.alt} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Text — till höger, eget kort */}
      <div
        className="relative z-10 w-full md:max-w-[620px] md:aspect-[16/10] -mt-4 md:mt-0 md:-ml-3"
        style={{
          transform: `rotate(${-tilt.rotate}deg) translate(${-tilt.x}px, ${-tilt.y}px)`,
        }}
      >
        <div className={`relative h-full bg-white p-3 ${CARD_SHADOW}`}>
          {canEdit && (
            <Link
              href="/site-admin/hero-carousel"
              className="absolute top-3 right-3 z-10 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors bg-white/70 rounded-md px-2 py-1"
            >
              ✎ {editLinkLabel}
            </Link>
          )}
          <div className={`h-full md:overflow-y-auto border border-muted-teal/20 pl-6 md:pl-10 pr-6 pt-8 md:pt-3 pb-5 flex flex-col justify-start ${heroTintClass(slide.tintColor, slide.tintOpacity)}`}>
            <div className="flex flex-col items-start text-left">
              <h2 className={`${handwritingFont.className} text-dark-slate pr-16`} style={{ textWrap: "balance", fontSize: 26 }}>
                {slide.heading}
              </h2>
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
      </div>
    </div>
  );
}
