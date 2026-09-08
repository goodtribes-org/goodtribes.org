import Image from "next/image";

// Reduced hero shown on workspace subpages (Uppgifter, Kalender, Verktyg-sidorna, ...) —
// just the project's blurred background image with its name straight and large on top.
export default function ProjectMiniHero({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  return (
    <div
      className="relative -mt-8 flex items-center justify-center overflow-hidden border-b border-muted-teal/20"
      style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", height: 90 }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <h1 className="relative z-10 truncate px-4 text-center text-4xl font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:text-5xl">
        {title}
      </h1>
    </div>
  );
}
