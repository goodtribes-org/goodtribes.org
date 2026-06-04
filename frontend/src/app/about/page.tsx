export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-bold mb-6">Vilka är Goodtribes?</h1>

      <p className="text-lg text-dark-slate mb-6">
        Goodtribes drivs som en stiftelse med ett enda övergripande mål: att göra
        världen bättre för oss som lever i den idag, och för generationerna efter
        oss. Vi tror inte på att vänta på att någon annan ska lösa problemen. Vi
        tror på att organisera oss nerifrån och upp.
      </p>

      <p className="text-dark-slate mb-8">
        När en person har en bra idé krävs det ofta ett helt team för att
        genomföra den. Genom att sänka trösklarna och göra det enkelt att
        samarbeta skapar vi en folkrörelse av praktisk hållbarhet. Hos oss blir
        ingen lämnad ensam med sin vision.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Vad vi gör</h2>
      <ul className="space-y-3 text-dark-slate mb-8">
        <li className="flex gap-3">
          <span className="text-muted-teal mt-1">—</span>
          <span>
            <strong>Projekt</strong> — Vi bygger och driver öppna digitala
            verktyg för ideella organisationer och socialt engagerade initiativ.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-teal mt-1">—</span>
          <span>
            <strong>Gemenskap</strong> — Vi samlar människor med vilja och
            kompetens att bidra till något större än sig själva.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-teal mt-1">—</span>
          <span>
            <strong>Transparens</strong> — Allt vi gör är öppet. Kod, beslut
            och riktning delar vi med oss av.
          </span>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-3">Kontakt</h2>
      <p className="text-dark-slate">
        Vill du veta mer eller bli en del av GoodTribes?{" "}
        <a
          href="mailto:hej@goodtribes.org"
          className="text-coral underline underline-offset-4 hover:text-seagrass"
        >
          hej@goodtribes.org
        </a>
      </p>
    </div>
  );
}
