import type { SitePageSlug } from "@/app/[locale]/site-pages-actions";

// Bootstrap copy for About/Privacy/Terms, shown until a site admin saves an
// edit via the inline pencil (see EditableSitePage.tsx) and used to seed the
// editor the first time it's opened for a given slug.
//
// Swedish only: SitePage has no locale column (one row per slug serves both
// locales), so this is the single fallback shown regardless of the visitor's
// locale — Swedish was chosen since it's the site's default/primary locale.
// An English-locale visitor will see this Swedish text until a per-locale
// editorial system exists.
export const DEFAULT_SITE_PAGES: Record<SitePageSlug, { title: string; body: string }> = {
  about: {
    title: "Vilka är GoodTribes?",
    body: `
      <p>GoodTribes drivs som en stiftelse med ett övergripande mål: att göra världen bättre för oss som lever i den idag, och för generationerna efter oss. Vi tror inte på att vänta på att någon annan ska lösa problemen. Vi tror på att organisera underifrån.</p>
      <p>När någon har en bra idé krävs det ofta ett helt team för att genomföra den. Genom att sänka trösklarna och göra det enkelt att samarbeta skapar vi en folkrörelse för praktisk hållbarhet. Ingen ska behöva vara ensam med sin vision.</p>
      <h2>Vad vi gör</h2>
      <ul>
        <li><strong>Projekt</strong> — Vi bygger och driver öppna digitala verktyg för ideella organisationer och samhällsengagerade initiativ.</li>
        <li><strong>Community</strong> — Vi samlar människor med vilja och kompetens att bidra till något större än sig själva.</li>
        <li><strong>Transparens</strong> — Allt vi gör är öppet. Kod, beslut och riktning delas öppet.</li>
      </ul>
      <h2>Kontakt</h2>
      <p>Vill du veta mer eller bli en del av GoodTribes? <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a></p>
    `.trim(),
  },
  privacy: {
    title: "Integritetspolicy",
    body: `
      <p><em>Senast uppdaterad: juni 2026</em></p>
      <h2>Vilka vi är</h2>
      <p>GoodTribes är en ideell stiftelse som driver GoodTribes.org — en plattform som kopplar samman kompetenta volontärer med organisationer som vill göra skillnad. Vår kontaktadress är <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>.</p>
      <h2>Vilken data vi samlar in</h2>
      <ul>
        <li><strong>Kontodata:</strong> din e-postadress, ditt namn, bio, land, profilbild och sociala länkar — som du själv anger vid registrering.</li>
        <li><strong>Kompetenser och projektmedlemskap:</strong> kompetenser du lägger till på din profil och projekt du går med i eller skapar.</li>
        <li><strong>Sessionsdata:</strong> autentiseringstokens som sparas i din webbläsare för att hålla dig inloggad.</li>
        <li><strong>Användningsdata:</strong> handlingar du utför på plattformen (publicera uppdateringar, chattmeddelanden, kanban-kort med mera) som sparas för att kunna leverera tjänsten.</li>
      </ul>
      <p>Vi samlar inte in mer data än vad som krävs för att driva plattformen. Vi säljer inte din data. Vi använder ingen reklam.</p>
      <h2>Hur vi använder din data</h2>
      <ul>
        <li>För att leverera GoodTribes.org-tjänsten, inklusive profilvisning, projektsamarbete och notiser.</li>
        <li>För att skicka transaktionsmejl som inloggningslänkar, notiser om medlemsförfrågningar och projektuppdateringar. Du kan välja bort det veckovisa nyhetsbrevet i dina inställningar.</li>
        <li>För att matcha dina kompetenser med relevanta projekt (om du valt att göra din profil synlig).</li>
      </ul>
      <h2>Datalagring och säkerhet</h2>
      <p>Din data lagras i en PostgreSQL-databas på servrar inom EU. Filuppladdningar lagras i objektlagring (S3-kompatibel). Vi använder HTTPS för alla anslutningar. Inloggning sker via kortlivade inloggningslänkar — vi lagrar aldrig lösenord.</p>
      <h2>Dina rättigheter</h2>
      <p>Enligt GDPR har du rätt att få tillgång till, rätta och radera dina personuppgifter. Du kan radera ditt konto när som helst under Inställningar. För förfrågningar om din data, kontakta oss på <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>.</p>
      <h2>Tredjepartstjänster</h2>
      <ul>
        <li><strong>Resend</strong> — används för att skicka transaktionsmejl.</li>
        <li><strong>Meilisearch</strong> — används för fritextsökning bland publika profiler, projekt och organisationer.</li>
      </ul>
      <p>Dessa tjänster får endast den minimala data som krävs för att utföra sin funktion.</p>
      <h2>Ändringar</h2>
      <p>Vi kan komma att uppdatera denna policy. Väsentliga ändringar kommuniceras via e-post eller ett meddelande på plattformen.</p>
    `.trim(),
  },
  terms: {
    title: "Användarvillkor",
    body: `
      <p><em>Senast uppdaterad: juni 2026</em></p>
      <p>Genom att använda GoodTribes.org godkänner du dessa villkor. GoodTribes drivs av GoodTribes Foundation (Stiftelsen GoodTribes), en ideell organisation.</p>
      <h2>1. Ditt konto</h2>
      <p>Du ansvarar för att hålla ditt konto säkert och för all aktivitet under det. Du måste vara minst 16 år för att använda plattformen. Du får endast ha ett konto.</p>
      <h2>2. Vad du får göra</h2>
      <ul>
        <li>Skapa en profil och gå med i eller starta projekt och organisationer.</li>
        <li>Publicera uppdateringar, chattmeddelanden, wikisidor, idéer och annat innehåll i samband med gemensamma projekt.</li>
        <li>Bjuda in andra till projekt och organisationer du administrerar.</li>
      </ul>
      <h2>3. Vad du inte får göra</h2>
      <ul>
        <li>Publicera innehåll som är olagligt, skadligt, kränkande, ärekränkande eller som bryter mot andras rättigheter.</li>
        <li>Använda plattformen för kommersiell spam eller oönskade massutskick.</li>
        <li>Försöka komma åt andras konton eller data utan tillstånd.</li>
        <li>Använda plattformen för annat än genuint samhällsengagerat samarbete.</li>
      </ul>
      <h2>4. Innehåll och immateriella rättigheter</h2>
      <p>Du behåller äganderätten till innehåll du skapar. Genom att publicera innehåll ger du GoodTribes en licens att visa och distribuera det till andra användare som en del av tjänsten. Du får inte publicera innehåll du inte har rätt att dela.</p>
      <h2>5. Volontärarbete</h2>
      <p>GoodTribes underlättar volontärsamarbete. Plattformen skapar inga anställningsförhållanden. Eventuella överenskommelser mellan projektägare och bidragsgivare är enbart mellan dessa parter — GoodTribes Foundation är inte part i dem.</p>
      <h2>6. Uppsägning</h2>
      <p>Vi kan stänga av eller radera konton som bryter mot dessa villkor. Du kan radera ditt konto när som helst under Inställningar.</p>
      <h2>7. Ansvar</h2>
      <p>GoodTribes.org tillhandahålls i befintligt skick. Vi lämnar ingen garanti för att tjänsten är oavbruten eller felfri. I den utsträckning lagen tillåter ansvarar inte GoodTribes Foundation för skador som uppstår vid användning av plattformen.</p>
      <h2>8. Ändringar</h2>
      <p>Vi kan komma att uppdatera dessa villkor. Fortsatt användning av plattformen efter ändringar innebär att du accepterar dem. Vi meddelar användare om väsentliga ändringar via e-post.</p>
      <h2>9. Kontakt</h2>
      <p>Frågor? Mejla oss på <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>.</p>
    `.trim(),
  },
};
