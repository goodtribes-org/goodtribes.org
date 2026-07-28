import Image from "next/image";
import { handwritingFont } from "@/lib/fonts";

// Reduced hero shown on workspace subpages (Uppgifter, Kalender, Verktyg-sidorna, ...) —
// same full-bleed banner as the Startsidan hero, just with a smaller, straight (unrotated)
// title and no photo/team card row, since those only make sense as a landing intro.
export default function ProjectMiniHero({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  return (
    <div className="relative -mt-8" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
      <div className="absolute inset-0 overflow-hidden">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
        )}
      </div>
      <div className="relative z-10 flex items-center justify-center px-6 py-2">
        <h1
          className={`${handwritingFont.className} text-center leading-tight`}
          style={{ color: "white", fontSize: 44, textShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
