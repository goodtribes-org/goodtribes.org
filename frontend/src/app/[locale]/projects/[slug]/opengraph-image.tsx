import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { prisma } from "@/lib/prisma";
import { resolveProjectContent } from "@/lib/contentTranslation";
import { routing } from "@/i18n/routing";
import { SDG_COLORS } from "@/lib/sdg";
import { toDisplayPhase } from "@/lib/projectPhase";
import { getFounderWords } from "@/lib/founderWords";
import { cardImageDataUrl, shareDescription } from "@/lib/shareCard";

// The picture a shared project link shows (#273). A draft or hidden project
// gets the plain GoodTribes card: crawlers are never members, and the card
// must not leak what notFoundUnlessVisible keeps out of the page.

export const alt = "GoodTribes.org";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Cached like a page; an edited title shows up within the hour.
export const revalidate = 3600;

const INK = "#1B1F1D";
const SLATE = "#254441";
const CORAL = "#FF6600";
const CREAM = "#FAF7F2";

async function logoDataUrl(): Promise<string | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public/icons/icon-192.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// The card renderer reads TTF, not the site's woff2 fonts, and its built-in
// font has a single weight — so Noto Sans ships in public/fonts/og (OFL).
// Missing files only cost the bold, never the card.
async function cardFonts() {
  const fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" | "italic" }[] = [];
  for (const [file, weight, style] of [["Regular", 400, "normal"], ["Bold", 700, "normal"], ["Italic", 400, "italic"]] as const) {
    try {
      fonts.push({ name: "Noto Sans", data: await readFile(join(process.cwd(), `public/fonts/og/NotoSans-${file}.ttf`)), weight, style });
    } catch {
      // fall back to the renderer's default font
    }
  }
  return fonts;
}

function Brand({ logo, light }: { logo: string | null; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {logo && (
        <div style={{ display: "flex", padding: light ? 6 : 0, background: light ? "#FFFFFF" : "transparent", borderRadius: 14 }}>
          <img src={logo} width={52} height={52} style={{ borderRadius: 12 }} />
        </div>
      )}
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: light ? "#FFFFFF" : SLATE }}>GoodTribes.org</div>
    </div>
  );
}

function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [logo, fonts, t, tPhase] = await Promise.all([
    logoDataUrl(),
    cardFonts(),
    getTranslations({ locale, namespace: "ShareCard" }),
    getTranslations({ locale, namespace: "ProjectPhase" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true, title: true, summary: true, description: true, imageUrl: true, phase: true, sdgGoals: true,
      publishedAt: true, hiddenAt: true,
      _count: { select: { members: { where: { role: { not: "FOLLOWER" } } } } },
      translations: locale !== routing.defaultLocale ? { where: { locale } } : false,
    },
  });

  if (!project || !project.publishedAt || project.hiddenAt) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: SLATE, fontFamily: "Noto Sans" }}>
          <Brand logo={logo} light />
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1, maxWidth: 900 }}>{t("tagline")}</div>
          <div style={{ display: "flex", height: 10, width: 220, background: CORAL, borderRadius: 5 }} />
        </div>
      ),
      { ...size, fonts },
    );
  }

  const content = resolveProjectContent(project, project.translations || [], locale as Locale);
  const founder = await getFounderWords(project.id, project.description).catch(() => ({ dream: null, why: null }));
  const quote = founder.dream ? clamp(founder.dream, 170) : null;
  const text = quote ?? shareDescription({ summary: content.summary, description: content.description });
  const image = await cardImageDataUrl(project.imageUrl);
  const sdgs = project.sdgGoals.slice(0, 6);
  const colorA = SDG_COLORS[sdgs[0]] ?? SLATE;
  const colorB = SDG_COLORS[sdgs[1]] ?? "#12486C";
  const people = project._count.members;
  const title = clamp(content.title, 80);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: CREAM, fontFamily: "Noto Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: image ? 760 : 1200, padding: "56px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Brand logo={logo} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: SLATE, border: `3px solid ${SLATE}`, borderRadius: 999, padding: "6px 20px" }}>
              {tPhase(toDisplayPhase(project.phase))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", fontSize: title.length > 44 ? 54 : 66, fontWeight: 700, color: INK, lineHeight: 1.08 }}>{title}</div>
            {text && (
              <div style={{ display: "flex", fontSize: 28, color: "#3F4A47", lineHeight: 1.35, fontStyle: quote ? "italic" : "normal" }}>
                {quote ? `”${text}”` : text}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10 }}>
              {sdgs.map((g) => (
                <div key={g} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 10, background: SDG_COLORS[g] ?? SLATE, color: "#FFFFFF", fontSize: 22, fontWeight: 700 }}>
                  {String(g)}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: CORAL }}>
              {people > 1 ? t("people", { count: people }) : t("join")}
            </div>
          </div>
        </div>

        {image ? (
          <div style={{ display: "flex", width: 440, height: "100%", background: `linear-gradient(135deg, ${colorA}, ${colorB})` }}>
            <img src={image} width={440} height={630} style={{ objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 16, height: "100%", background: `linear-gradient(180deg, ${colorA}, ${colorB})` }} />
        )}
      </div>
    ),
    { ...size, fonts },
  );
}
