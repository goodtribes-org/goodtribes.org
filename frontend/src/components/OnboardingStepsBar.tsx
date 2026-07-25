type OnboardingStep = { n: string; label: string; href: string; circleClass: string };

// Linjen mellan cirklarna: 5 segment som tonar från varm gul till röd.
const LINE_SEGMENT_COLORS = ["#ffcc00", "#f49a01", "#e86903", "#dd3704", "#d10505"];

// Steg 1 börjar i samma färg som tidigare steg 2 och tonar stegvis över till coral (steg 6:s färg).
const ONBOARDING_STEPS: OnboardingStep[] = [
  { n: "1", label: "Skapa ett konto", href: "/login", circleClass: "bg-[#ffb800] text-white" },
  { n: "2", label: "Hitta projekt som är rätt för dig", href: "/projects", circleClass: "bg-[#ffa800] text-white" },
  { n: "3", label: "\"Joina\" din Tribe som brinner för samma saker som du", href: "/projects/new", circleClass: "bg-[#ff9700] text-white" },
  { n: "4", label: "Vidareutveckla eller lägg upp en egen idé/projekt", href: "/ideas/new", circleClass: "bg-[#ff8700] text-white" },
  { n: "5", label: "Förändra världen genom små och stora insatser", href: "/hall-of-impact", circleClass: "bg-[#ff7600] text-white" },
  { n: "6", label: "Lev gott, Må gott, Gör gott och förverkliga idéer och drömmar", href: "/about", circleClass: "bg-coral text-white" },
];

export default function OnboardingStepsBar() {
  return (
    <div className="flex justify-center py-6">
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
        {ONBOARDING_STEPS.map((s) => (
          <div key={s.n} className="flex flex-col items-center text-center px-2">
            <span
              className={`relative z-10 w-16 h-16 rounded-full text-2xl font-bold flex items-center justify-center shrink-0 ${s.circleClass}`}
            >
              {s.n}
            </span>
            <p className="mt-2 text-xs font-normal text-dark-slate/60 max-w-xs mx-auto">{s.label}</p>
            {s.n === "1" && (
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
