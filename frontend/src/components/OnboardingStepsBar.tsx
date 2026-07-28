import Link from "next/link";

export type OnboardingStepData = { id: string; label: string; href: string };

// Linjen mellan cirklarna: 5 segment som tonar från varm gul till röd.
const LINE_SEGMENT_COLORS = ["#ffcc00", "#f49a01", "#e86903", "#dd3704", "#d10505"];

// Steg 1 börjar i samma färg som tidigare steg 2 och tonar stegvis över till coral (steg 6:s färg).
// Cirkelfärgerna är knutna till positionen i den fasta 6-stegsresan, inte till innehållet i sig.
const CIRCLE_CLASSES = [
  "bg-[#ffb800] text-white",
  "bg-[#ffa800] text-white",
  "bg-[#ff9700] text-white",
  "bg-[#ff8700] text-white",
  "bg-[#ff7600] text-white",
  "bg-coral text-white",
];

export default function OnboardingStepsBar({ steps, canEdit }: { steps: OnboardingStepData[]; canEdit: boolean }) {
  return (
    <div className="relative flex justify-center py-6">
      {canEdit && (
        <Link
          href="/site-admin/hero-carousel"
          className="absolute top-1 right-4 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors bg-white/70 rounded-md px-2 py-1"
        >
          ✎ Redigera
        </Link>
      )}
      <div className="relative grid grid-cols-1 md:grid-cols-6 gap-x-12 gap-y-10 w-full max-w-4xl">
        {/* Linje genom cirklarnas mittpunkter — de täcker linjen där de sitter, så det ser ut som segment mellan dem */}
        <div
          className="hidden md:flex absolute"
          style={{ top: 32, left: "calc(100% / 12 - 20px)", right: "calc(100% / 12 - 20px)" }}
          aria-hidden="true"
        >
          {LINE_SEGMENT_COLORS.map((color, i) => (
            <div key={i} className="flex-1 border-t-2 border-dashed" style={{ borderColor: color }} />
          ))}
        </div>
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-col items-center text-center px-2">
            <span
              className={`relative z-10 w-16 h-16 rounded-full text-2xl font-bold flex items-center justify-center shrink-0 ${CIRCLE_CLASSES[i % CIRCLE_CLASSES.length]}`}
            >
              {i + 1}
            </span>
            <p className="mt-2 text-xs font-normal text-dark-slate/60 max-w-xs mx-auto">{s.label}</p>
            {i === 0 && (
              <a
                href={s.href}
                className="mt-2 text-coral text-xs font-bold px-3 py-1 rounded-full border border-coral hover:bg-coral/5 transition-colors whitespace-nowrap"
              >
                Sign in
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
