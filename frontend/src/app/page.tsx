import Link from "next/link";

const GALLERY_IMAGES = [
  { w: 400, h: 240, label: "Projekt+A" },
  { w: 400, h: 240, label: "Projekt+B" },
  { w: 400, h: 240, label: "Projekt+C" },
  { w: 400, h: 240, label: "Projekt+D" },
  { w: 400, h: 240, label: "Projekt+E" },
];

export default function HomePage() {
  return (
    <div className="space-y-16">

      {/* Image gallery */}
      <section>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
          {GALLERY_IMAGES.map((img) => (
            <img
              key={img.label}
              src={`https://dummyimage.com/${img.w}x${img.h}/e5e7eb/9ca3af&text=${img.label}`}
              alt=""
              role="presentation"
              width={img.w}
              height={img.h}
              className="rounded-lg flex-shrink-0 object-cover"
            />
          ))}
        </div>
      </section>

      {/* People block */}
      <section className="border border-muted-teal rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-3">Bidra med din kompetens</h2>
        <p className="text-dark-slate/70 mb-6 max-w-xl">
          Det finns gott om människor som vill göra skillnad i världen — och
          lika många organisationer som behöver just din hjälp. Lägg till dina
          färdigheter och bli en del av ett nätverk som bygger något som
          verkligen spelar roll.
        </p>
        <Link
          href="/members"
          className="inline-block bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
        >
          Se våra medlemmar →
        </Link>
      </section>

      {/* Org block */}
      <section className="border border-muted-teal rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-3">Är du en organisation?</h2>
        <p className="text-dark-slate/70 mb-6 max-w-xl">
          Hundratals organisationer arbetar varje dag för att göra världen till
          en bättre plats — men de behöver fler händer. Lista din organisation
          hos oss så kopplar vi ihop dig med rätt personer som vill och kan
          hjälpa till.
        </p>
        <Link
          href="/projects"
          className="inline-block bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
        >
          Se våra projekt →
        </Link>
      </section>

    </div>
  );
}
