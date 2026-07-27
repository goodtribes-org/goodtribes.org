import Image from "next/image";

// Reduced hero shown on workspace subpages (Uppgifter, Kalender, Verktyg-sidorna, ...) —
// same full-bleed banner + title styling as the Startsidan hero, just without the photo/team
// card row and with a shorter background band, since those only make sense as a landing intro.
export default function ProjectMiniHero({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  return (
    <div className="relative -mt-8 mb-2" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "220px" }}>
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
        )}
      </div>
      <div className="relative z-10 flex items-center justify-center sm:pl-16 lg:pl-56 px-6" style={{ height: "220px" }}>
        <h1
          className="text-5xl md:text-6xl font-bold text-center leading-tight"
          style={{
            color: "white",
            textShadow: "-1px -1px 0 #999, 1px -1px 0 #999, -1px 1px 0 #999, 1px 1px 0 #999, 2px 4px 12px rgba(0,0,0,0.35)",
            transform: "rotate(-3deg)",
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
