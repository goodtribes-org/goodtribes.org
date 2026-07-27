import Image from "next/image";

// Reduced hero shown on workspace subpages (Uppgifter, Kalender, Verktyg-sidorna, ...) —
// same full-bleed banner as the Startsidan hero, just with a smaller, straight (unrotated)
// title and no photo/team card row, since those only make sense as a landing intro.
export default function ProjectMiniHero({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  return (
    <div className="relative -mt-8 mb-2" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
      <div className="absolute inset-0 overflow-hidden">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
        )}
      </div>
      <div className="relative z-10 flex items-center justify-center sm:pl-16 lg:pl-56 px-6 py-5">
        <h1
          className="text-3xl md:text-4xl font-bold text-center leading-tight"
          style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
