// Reduced hero shown on workspace subpages (Uppgifter, Kalender, Verktyg-sidorna, ...) —
// same full-bleed dark banner as the Startsidan hero, but without the project photo
// or the team/SDG card, since those only make sense as a landing-page introduction.
export default function ProjectMiniHero({ title }: { title: string }) {
  return (
    <div className="relative -mt-8 mb-2" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" style={{ height: "140px" }} />
      <div className="relative z-10 flex items-center justify-center sm:pl-16 lg:pl-56 px-6" style={{ height: "140px" }}>
        <h1
          className="text-2xl md:text-3xl font-bold text-center leading-tight"
          style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
