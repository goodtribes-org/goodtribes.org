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

      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-4xl font-bold mb-6">
          Tillsammans gör vi bra idéer till verklighet
        </h1>
        <p className="text-lg text-dark-slate/70 max-w-2xl mx-auto mb-8">
          Runt om i världen bubblar det av fantastiska idéer. Det finns projekt
          som vill rädda våra bin, städa våra hav eller skapa tryggare kvarter.
          Samtidigt finns det tusentals människor som vill hjälpa till och göra
          skillnad – men som inte vet var de ska börja.
        </p>
        <p className="text-dark-slate/70 max-w-2xl mx-auto mb-8">
          Goodtribes är mötesplatsen däremellan. Vi är en stiftelse som kopplar
          ihop visionära projekt med engagerade individer. Genom att matcha rätt
          behov med rätt kompetens ser vi till att goda initiativ inte stannar
          vid en dröm, utan faktiskt blir till verklighet.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center text-dark-slate/80">
          <p>
            <strong>Har du ett projekt?</strong> Beskriv vad du behöver.
          </p>
          <span className="hidden sm:inline text-dark-slate/40">·</span>
          <p>
            <strong>Vill du hjälpa till?</strong> Dela med dig av din tid eller
            kunskap.
          </p>
        </div>
      </section>

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

      {/* How it works */}
      <section>
        <h2 className="text-3xl font-bold mb-3">Så här fungerar Goodtribes</h2>
        <p className="text-dark-slate/70 mb-8 max-w-2xl">
          Vår plattform bygger på ett enkelt samspel: Du har ett mål, och din
          "tribe" hjälper dig att nå det. Hos oss kan du antingen starta ett
          projekt eller erbjuda din hjälp.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Example 1: The project */}
          <div className="border border-muted-teal rounded-lg p-8 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-teal mb-3">
              Exempel 1 — Projektet
            </p>
            <h3 className="text-xl font-bold mb-3">"Rädda Skogssjön"</h3>
            <p className="text-dark-slate/70 mb-4 text-sm">
              Ett lokalt projekt som vill rensa upp en nedskräpad naturstig och
              plantera vilda blommor för att gynna pollinering.
            </p>
            <ul className="text-sm text-dark-slate/70 space-y-2 mb-6">
              <li>
                <strong>Vad de har:</strong> En tydlig plan och massor av
                energi.
              </li>
              <li>
                <strong>Vad de saknar:</strong> En snickare för insektshotell,
                någon som är bra på sociala medier, och tio personer till
                skräpplockardagen.
              </li>
              <li>
                <strong>Lösningen:</strong> De lägger upp sitt projekt på
                Goodtribes och listar exakt dessa behov.
              </li>
            </ul>
            <div className="mt-auto">
              <Link
                href="/org/new"
                className="inline-block bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
              >
                Starta ett projekt →
              </Link>
            </div>
          </div>

          {/* Example 2: The volunteer */}
          <div className="border border-muted-teal rounded-lg p-8 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-teal mb-3">
              Exempel 2 — Personen
            </p>
            <h3 className="text-xl font-bold mb-3">Anna, 34 år</h3>
            <p className="text-dark-slate/70 mb-4 text-sm">
              Vill gärna bidra till miljön men har inte tid att starta något
              eget. Hon är grafisk formgivare och har några timmar över på
              helgerna.
            </p>
            <ul className="text-sm text-dark-slate/70 space-y-2 mb-6">
              <li>
                <strong>Hennes vilja:</strong> Att använda sin yrkeskunskap
                eller sin fritid till något meningsfullt.
              </li>
              <li>
                <strong>Lösningen:</strong> Anna hittar "Rädda Skogssjön" på
                Goodtribes, designar affischer och dyker upp på lördagens
                skräpplockardagen.
              </li>
            </ul>
            <div className="mt-auto">
              <Link
                href="/org"
                className="inline-block bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
              >
                Hitta ett projekt →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-dark-slate/70 italic">
          Genom Goodtribes fann projektet och Anna varandra. Projektet lyckades,
          sjön blev ren, och Anna fick göra skillnad på ett sätt som passade
          henne.
        </p>
      </section>

      {/* CTA */}
      <section className="border border-muted-teal rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Världen förändras inte av en person — den förändras när vi blir en
          Tribe
        </h2>
        <p className="text-dark-slate/70 mb-4 max-w-2xl mx-auto">
          Går du och bär på en idé som kan förbättra ditt närområde eller vår
          miljö? Eller har du kunskap, muskler eller ett par timmar över som du
          vill investera i en bättre framtid?
        </p>
        <p className="text-dark-slate/70 mb-8 max-w-2xl mx-auto">
          Varje stor förändring börjar med ett litet steg. Hos Goodtribes är
          ingen insats för liten och ingen dröm för stor. Det är när vi delar
          med oss av det vi kan som magi uppstår.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/org/new"
            className="inline-block bg-coral text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-watermelon transition-colors"
          >
            Skapa ditt projekt →
          </Link>
          <Link
            href="/org"
            className="inline-block border border-coral text-coral text-sm font-medium px-5 py-2.5 rounded-md hover:bg-coral hover:text-white transition-colors"
          >
            Anmäl dig som volontär →
          </Link>
        </div>
      </section>

    </div>
  );
}
