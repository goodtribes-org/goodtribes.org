import Link from "next/link";
import type { PillarKey } from "@/lib/aboutPillars";

// Content saved through the rich-text editor is HTML; content seeded before
// it was added is plain text — same detection as HeroSlideRow's RichText.
function RichText({ html, className }: { html: string; className: string }) {
  const trimmed = html.trim();
  if (trimmed.startsWith("<")) {
    return (
      <div
        className={`prose prose-sm max-w-none prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <p className={className}>{html}</p>;
}

// The four boxes on /about (Leva Gott, Må Gott, Göra Gott, Dröm stort),
// moved there from the top of Drömfabriken when /sandbox was removed (#224).
// Texts come from SandboxHeroSettings (lib/aboutPillars.ts), edited at
// /site-admin/about-pillars. The icons are simple white-line SVGs, and each
// header fades from the pillar's base color. PILLARS' array order is the
// display order (left to right).
function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 3c1 8-2 15-9 17z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

function ThumbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4.24 12.6c.6.46.94 1.16 1.02 1.9L9 18h6l.22-1.5c.08-.74.42-1.44 1.02-1.9A7 7 0 0 0 12 2z" />
    </svg>
  );
}

const PILLARS = [
  { Icon: LeafIcon, color: "var(--color-seagrass)", key: "levaGott" as const },
  { Icon: ThumbIcon, color: "var(--color-navy)", key: "maGott" as const },
  { Icon: HeartIcon, color: "var(--color-watermelon)", key: "goraGott" as const },
  { Icon: BulbIcon, color: "var(--color-coral)", key: "dreamGood" as const },
];

export default function Pillars({
  headings,
  bodies,
  canEdit,
  editHref,
  editLabel,
}: {
  headings: Record<PillarKey, string>;
  bodies: Record<PillarKey, string>;
  canEdit?: boolean;
  editHref?: string;
  editLabel?: string;
}) {
  return (
    <div className="relative">
      {canEdit && editHref && (
        <div className="mb-2 flex justify-end">
          <Link
            href={editHref}
            className="text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors"
          >
            ✎ {editLabel}
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PILLARS.map((p) => (
          <div
            key={p.key}
            className="bg-white border border-[#ecd9a8] rounded-[14px] overflow-hidden shadow-[0_10px_24px_-14px_rgba(37,68,65,0.18)]"
          >
            <div
              className="flex items-center gap-2 px-4 py-3 text-white font-bold text-sm uppercase tracking-wide"
              style={{ background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 30%, white))` }}
            >
              <p.Icon />
              <span>{headings[p.key]}</span>
            </div>
            <div className="p-4">
              <RichText html={bodies[p.key]} className="text-xs text-dark-slate/70 leading-relaxed text-center" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
