export default function AboutPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-bold mb-6">Om oss</h1>

      <p className="text-lg text-gray-700 mb-6">
        GoodTribes.org är en plattform som kopplar samman kompetenta individer med
        organisationer som gör meningsfull skillnad. Vi tror på kraften i att
        samarbeta — att rätt person på rätt plats kan förändra världen lite grand.
      </p>

      <h2 className="text-2xl font-semibold mb-4">Vad vi gör</h2>
      <ul className="space-y-3 text-gray-700 mb-8">
        <li className="flex gap-3">
          <span className="text-gray-400 mt-1">—</span>
          <span>
            <strong>Projekt</strong> — Vi bygger och driver öppna digitala
            verktyg för ideella organisationer och socialt engagerade initiativ.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-gray-400 mt-1">—</span>
          <span>
            <strong>Gemenskap</strong> — Vi samlar människor med vilja och
            kompetens att bidra till något större än sig själva.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-gray-400 mt-1">—</span>
          <span>
            <strong>Transparens</strong> — Allt vi gör är öppet. Kod, beslut
            och riktning delar vi med oss av.
          </span>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-3">Kontakt</h2>
      <p className="text-gray-700">
        Vill du veta mer eller bli en del av GoodTribes?{" "}
        <a
          href="mailto:hej@goodtribes.org"
          className="text-gray-900 underline underline-offset-4 hover:text-gray-600"
        >
          hej@goodtribes.org
        </a>
      </p>
    </div>
  );
}
