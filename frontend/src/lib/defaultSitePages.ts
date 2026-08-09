import type { SitePageSlug } from "@/app/[locale]/site-pages-actions";
import type { Locale } from "next-intl";

// Bootstrap copy for About/Privacy/Terms, shown until a site admin saves an
// edit via the inline pencil (see EditableSitePage.tsx) for that slug+locale,
// and used to seed the editor the first time it's opened. One entry per
// locale — see getSitePage in sitePages.ts for the fallback chain (exact
// locale row → this default for that locale → sv default).
export const DEFAULT_SITE_PAGES: Record<SitePageSlug, Record<Locale, { title: string; body: string }>> = {
  about: {
    sv: {
      title: "Vilka är GoodTribes?",
      body: `
        <p>GoodTribes drivs som en stiftelse med ett övergripande mål: att göra världen bättre för oss som lever i den idag, och för generationerna efter oss. Vi tror inte på att vänta på att någon annan ska lösa problemen. Vi tror på att organisera underifrån.</p>
        <p>När någon har en bra idé krävs det ofta ett helt team för att genomföra den. Genom att sänka trösklarna och göra det enkelt att samarbeta skapar vi en folkrörelse för praktisk hållbarhet. Ingen ska behöva vara ensam med sin vision.</p>
        <h2>Vår historia</h2>
        <p><strong>Från datordonationer till en plattform för samhällsförändring</strong></p>
        <p>Allt startade inte med en affärsplan, utan med en dator.</p>
        <p>Innan Stiftelsen GoodTribes fanns startade Niklas Gunnäs initiativet Infos: Datordonation – ett ideellt projekt med en enkel men viktig idé: att samla in avskriven it-utrustning från offentlig sektor och näringslivet, och ge den nytt liv i händerna på barn, ungdomar och ideella organisationer som annars inte hade haft tillgång till en dator. Verksamheten var bara möjlig tack vare ett aktivt stöd och en nära samverkan med både offentlig sektor och näringslivet, som gång på gång valde att skänka istället för att skrota. Med tiden växte initiativet till något betydligt större än en enskild idé: en verksamhet som drevs av ett tiotal heltidsanställda och stöttades av omkring ett hundratal frivilliga, som tillsammans donerade datorer och annan it-utrustning till behövande runt om i Sverige. Under de år verksamheten var aktiv donerades utrustning till ett sammanlagt andrahandsvärde av omkring tio miljoner kronor – konkret, handgriplig <strong>Göra Gott</strong>-verksamhet, dator för dator, människa för människa.</p>
        <p>Men det som förändrade allt var alla möten som skedde längs vägen. Gång på gång stötte teamet och volontärerna på människor med genuint bra idéer om hur världen kunde bli bättre. Idéer om allt från små, lokala initiativ till mer omfattande samhällsförändrande projekt. Men samma mönster återkom: de som hade idéerna saknade nästan alltid det som krävdes för att förverkliga dem – tid, kompetens, nätverk, finansiering, eller helt enkelt någon som trodde på dem.</p>
        <p>Den insikten blev grogrunden till GoodTribes.</p>
        <p>Att göra gott handlar inte bara om enskilda handlingar, som en donerad dator eller en god idé – det handlar om att skapa förutsättningar för att det goda ska kunna fortsätta växa. Och det i sin tur hänger ihop med att människor <strong>mår gott</strong>: känner sig sedda, har tilltro till sin egen förmåga och vet att deras engagemang gör skillnad. Och med att man <strong>lever gott</strong> – på lång sikt, hållbart, i en värld som utvecklas i linje med FN:s Agenda 2030 och de globala hållbarhetsmålen. Göra Gott, Må Gott och Leva Gott blev de tre bärande pelarna i det som skulle bli GoodTribes: inte tre separata mål, utan tre sidor av samma sak.</p>
        <p>2021 grundades Stiftelsen GoodTribes formellt av Niklas Gunnäs, med detta som utgångspunkt: att bygga en plattform där goda idéer får de förutsättningar de behöver för att bli verkliga initiativ – där den som vill göra gott får verktygen för det, där engagemanget får näring att må gott av, och där resultatet bidrar till att fler kan leva gott, både idag och imorgon.</p>
        <p>GoodTribes vill medverka till att uppnå FN:s Agenda 2030 och de mänskliga rättigheterna – inte som avlägsna målsättningar, utan som den grund människor behöver för att kunna leva gott, må gott, göra gott och förverkliga sina drömmar.</p>
        <p>Från tusentals datorer som hittade nya ägare, till en plattform som ska hjälpa tusentals idéer hitta vägen från tanke till handling – det är resan som GoodTribes fortsätter på idag.</p>
        <h2>Vad vi gör</h2>
        <ul>
          <li><strong>Projekt</strong> — Vi bygger och driver öppna digitala verktyg för ideella organisationer och samhällsengagerade initiativ.</li>
          <li><strong>Community</strong> — Vi samlar människor med vilja och kompetens att bidra till något större än sig själva.</li>
          <li><strong>Transparens</strong> — Allt vi gör är öppet. Kod, beslut och riktning delas öppet.</li>
        </ul>
        <h2>Transparens &amp; organisationsinfo</h2>
        <p>Som en del av vårt löfte om transparens redovisar vi alltid vår organisationsinformation öppet:</p>
        <p>
          <strong>Stiftelsen GoodTribes</strong><br>
          Org.nr: 802481-8497<br>
          Högbergsgatan 52<br>
          118 26 Stockholm, Sverige<br>
          <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>
        </p>
        <h2>Kontakt</h2>
        <p>Vill du veta mer eller bli en del av GoodTribes? <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a></p>
      `.trim(),
    },
    en: {
      title: "Who are GoodTribes?",
      body: `
        <p>GoodTribes is run as a foundation with one overarching goal: to make the world better for those of us living in it today, and for the generations after us. We do not believe in waiting for someone else to solve the problems. We believe in organising from the bottom up.</p>
        <p>When a person has a good idea, it often takes a whole team to carry it out. By lowering the barriers and making it easy to collaborate, we create a people's movement of practical sustainability. No one is left alone with their vision.</p>
        <h2>Our History</h2>
        <p><strong>From computer donations to a platform for social change</strong></p>
        <p>It all started not with a business plan, but with a computer.</p>
        <p>Before Stiftelsen GoodTribes existed, Niklas Gunnäs started the initiative Infos: Datordonation (Computer Donation) – a nonprofit project with a simple but important idea: to collect decommissioned IT equipment from the public sector and businesses, and give it new life in the hands of children, young people, and nonprofit organizations that otherwise wouldn't have had access to a computer. This was only possible thanks to active support and close collaboration with both the public sector and businesses, who repeatedly chose to donate rather than scrap. Over time, the initiative grew into something far bigger than a single idea: an operation run by around ten full-time staff and supported by roughly a hundred volunteers, who together donated computers and other IT equipment to people in need across Sweden. During the years the operation was active, equipment with a combined secondhand value of around ten million SEK was donated – concrete, hands-on <strong>Doing Good</strong>, one computer at a time, one person at a time.</p>
        <p>But what changed everything were all the encounters along the way. Time and again, the team and volunteers met people with genuinely good ideas about how to make the world better. Ideas ranging from small, local initiatives to more far-reaching, society-changing projects. But the same pattern kept recurring: those with the ideas almost always lacked what was needed to realize them – time, skills, networks, funding, or simply someone who believed in them.</p>
        <p>That insight became the seed of GoodTribes.</p>
        <p>Doing good isn't only about individual acts, like a donated computer or a good idea – it's about creating the conditions for good to keep growing. And that, in turn, is connected to people <strong>feeling good</strong>: feeling seen, trusting in their own ability, and knowing their engagement makes a difference. And to <strong>living well</strong> – in the long run, sustainably, in a world developing in line with the UN's Agenda 2030 and the Sustainable Development Goals. Doing Good, Feeling Good, and Living Well became the three pillars of what would become GoodTribes: not three separate goals, but three sides of the same thing.</p>
        <p>In 2021, Stiftelsen GoodTribes was formally founded by Niklas Gunnäs, with this as its starting point: to build a platform where good ideas get the conditions they need to become real initiatives – where those who want to do good get the tools for it, where engagement is nourished to feel good, and where the result helps more people live well, both today and tomorrow.</p>
        <p>GoodTribes wants to contribute to achieving the UN's Agenda 2030 and human rights – not as distant goals, but as the foundation people need in order to live well, feel good, do good, and fulfill their dreams.</p>
        <p>From thousands of computers that found new owners, to a platform that will help thousands of ideas find their way from thought to action – that's the journey GoodTribes continues today.</p>
        <h2>What we do</h2>
        <ul>
          <li><strong>Projects</strong> — We build and run open digital tools for non-profit organisations and socially engaged initiatives.</li>
          <li><strong>Community</strong> — We bring together people with the will and skills to contribute to something bigger than themselves.</li>
          <li><strong>Transparency</strong> — Everything we do is open. Code, decisions and direction are shared openly.</li>
        </ul>
        <h2>Transparency &amp; organization info</h2>
        <p>As part of our commitment to transparency, we always share our organization information openly:</p>
        <p>
          <strong>Stiftelsen GoodTribes</strong><br>
          Org. no: 802481-8497<br>
          Högbergsgatan 52<br>
          118 26 Stockholm, Sweden<br>
          <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>
        </p>
        <h2>Contact</h2>
        <p>Want to know more or become part of GoodTribes? <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a></p>
      `.trim(),
    },
  },
  privacy: {
    sv: {
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
    en: {
      title: "Privacy Policy",
      body: `
        <p><em>Last updated: June 2026</em></p>
        <h2>Who we are</h2>
        <p>GoodTribes is a nonprofit foundation operating GoodTribes.org — a platform connecting skilled volunteers with impact-driven organisations. Our contact address is <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>.</p>
        <h2>What data we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your email address, name, bio, country, profile photo, and social links — provided by you when you register.</li>
          <li><strong>Skills and project memberships:</strong> skills you add to your profile and projects you join or create.</li>
          <li><strong>Session data:</strong> authentication tokens stored in your browser to keep you logged in.</li>
          <li><strong>Usage data:</strong> actions you take on the platform (posting updates, chat messages, kanban cards, etc.) stored to provide the service.</li>
        </ul>
        <p>We do not collect any data beyond what is necessary to operate the platform. We do not sell your data. We do not use advertising.</p>
        <h2>How we use your data</h2>
        <ul>
          <li>To provide the GoodTribes.org service, including profile display, project collaboration, and notifications.</li>
          <li>To send transactional emails such as magic-link login, join request notifications, and project updates. You can opt out of the weekly digest in your settings.</li>
          <li>To match your skills with relevant projects (if you opt in to profile visibility).</li>
        </ul>
        <h2>Data storage and security</h2>
        <p>Your data is stored in a PostgreSQL database on servers within the European Union. File uploads are stored in object storage (S3-compatible). We use HTTPS for all connections. Authentication uses short-lived magic links — we never store passwords.</p>
        <h2>Your rights</h2>
        <p>Under GDPR you have the right to access, correct, and delete your personal data. You can delete your account at any time from Settings. For any data requests, contact us at <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>.</p>
        <h2>Third-party services</h2>
        <ul>
          <li><strong>Resend</strong> — used to send transactional emails.</li>
          <li><strong>Meilisearch</strong> — used for full-text search of public profiles, projects, and organisations.</li>
        </ul>
        <p>These services only receive the minimum data necessary to perform their function.</p>
        <h2>Changes</h2>
        <p>We may update this policy. Significant changes will be communicated by email or a notice on the platform.</p>
      `.trim(),
    },
  },
  terms: {
    sv: {
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
    en: {
      title: "Terms of Service",
      body: `
        <p><em>Last updated: June 2026</em></p>
        <p>By using GoodTribes.org you agree to these terms. GoodTribes is operated by GoodTribes Foundation, a nonprofit organisation.</p>
        <h2>1. Your account</h2>
        <p>You are responsible for keeping your account secure and for all activity under it. You must be 16 years or older to use this platform. You may only have one account.</p>
        <h2>2. What you may do</h2>
        <ul>
          <li>Create a profile and join or start projects and organisations.</li>
          <li>Post updates, chat messages, wiki pages, ideas, and other content in the context of collaborative projects.</li>
          <li>Invite others to projects and organisations you administer.</li>
        </ul>
        <h2>3. What you may not do</h2>
        <ul>
          <li>Post content that is unlawful, harmful, abusive, defamatory, or that violates others' rights.</li>
          <li>Use the platform for commercial spam or unsolicited bulk messaging.</li>
          <li>Attempt to access others' accounts or data without authorisation.</li>
          <li>Use the platform for anything other than genuine social-impact collaboration.</li>
        </ul>
        <h2>4. Content and intellectual property</h2>
        <p>You retain ownership of content you create. By posting content you grant GoodTribes a licence to display and distribute it to other users as part of the service. You may not post content you do not have the right to share.</p>
        <h2>5. Volunteer work</h2>
        <p>GoodTribes facilitates volunteer collaboration. The platform does not create employment relationships. Any agreements between project owners and contributors are entirely between those parties — GoodTribes Foundation is not a party to them.</p>
        <h2>6. Termination</h2>
        <p>We may suspend or delete accounts that violate these terms. You may delete your account at any time from Settings.</p>
        <h2>7. Liability</h2>
        <p>GoodTribes.org is provided as-is. We make no warranty that the service will be uninterrupted or error-free. To the extent permitted by law, GoodTribes Foundation is not liable for any damages arising from use of the platform.</p>
        <h2>8. Changes</h2>
        <p>We may update these terms. Continued use of the platform after changes constitutes acceptance. We will notify users of material changes by email.</p>
        <h2>9. Contact</h2>
        <p>Questions? Email us at <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a>.</p>
      `.trim(),
    },
  },
  "code-of-conduct": {
    sv: {
      title: "Uppförandekod för GoodTribes",
      body: `
        <p>GoodTribes finns för att hjälpa människor att förverkliga idéer som gör världen bättre – att Göra Gott, Må Gott och Leva Gott. Det fungerar bara om alla som deltar, i alla faser från Idé till Impact, känner sig trygga, respekterade och lyssnade på.</p>
        <p>Den här koden gäller alla som deltar på GoodTribes: initiativtagare, medlemmar i en Tribe, volontärer, bidragsgivare och admins – i initiativ, kommentarer, meddelanden, Sandlådan och vid event som GoodTribes står bakom.</p>
        <h2>Våra principer</h2>
        <ol>
          <li><strong>Var respektfull.</strong> Ni kommer inte alltid vara överens – om en idé, en prioritering eller vilken fas ett initiativ borde vara i. Det är okej. Oenighet är ingen ursäkt för personangrepp eller att köra över någon i sin egen Tribe.</li>
          <li><strong>Anta god vilja.</strong> De flesta missförstånd beror på otydlighet, inte illvilja – särskilt i tidiga Idé-faser där tankar ofta är ofärdiga. Fråga innan du drar slutsatser om någons avsikt.</li>
          <li><strong>Ge konstruktiv feedback, inte bara kritik.</strong> Om du inte håller med om ett initiativs riktning, föreslå ett alternativ eller peka på en tidigare idé som löste liknande problem. GoodTribes bygger på att initiativtagare vågar visa upp ofärdiga idéer utan att bli nedgjorda för det.</li>
          <li><strong>Var ärlig om resultat och impact.</strong> Impact-signaler, SDG-koppling och insamlade medel bygger på självrapportering – det gör GoodTribes beroende av att folk är ärliga. Överdriv inte ett initiativs påverkan och dölj inte problem, missade mål eller att pengar använts på annat sätt än planerat.</li>
          <li><strong>Respektera anonymitet i Sandlådan – men missbruka den inte.</strong> Sandlådan är GoodTribes mest öppna zon, med ett undantag: anonyma bidrag är tillåtna där som en medveten avvikelse från vår annars fullständiga transparens. Det undantaget finns för att sänka trösklar, inte för att slippa stå för sina ord – anonymitet får aldrig användas för att trakassera, vilseleda eller undvika ansvar.</li>
          <li><strong>Respektera namnskydd vid forkning.</strong> Att forka ett initiativ är tillåtet och en del av hur GoodTribes är byggt – men en fork ärver inte rätten till originalets namn eller röstvikt. Ge alltid originalet erkännande och gör tydligt att din fork är just en fork, inte det ursprungliga initiativet.</li>
          <li><strong>Ge nya medlemmar utrymme.</strong> Alla var nya i sin Tribe en gång. Hjälp till att förklara hur faser, tokens och Granskningsrådet fungerar istället för att döma den som frågar "fel" saker.</li>
        </ol>
        <h2>Det här accepterar vi inte</h2>
        <ul>
          <li>Trakasserier, hot eller hatiskt språk – mot en individ eller en grupp</li>
          <li>Diskriminering på grund av kön, könsidentitet, sexuell läggning, etnicitet, religion, funktionsvariation, ålder eller andra skyddade grunder</li>
          <li>Personangrepp, doxxing eller spridning av privat information utan samtycke</li>
          <li>Medvetet vilseledande uppgifter om ett initiativs syfte, resultat, ekonomi eller impact-signaler</li>
          <li>Manipulation av GT-tokens, Tribe Tokens eller röster för att ge sken av stöd eller framgång som inte finns</li>
          <li>Idéstöld eller plagiat – att presentera någon annans initiativ eller arbete som sitt eget utan attribution eller fork-erkännande</li>
          <li>Att utge en fork för att vara originalinitiativet, eller utnyttja namnskyddet på ett vilseledande sätt</li>
          <li>Missbruk av anonymitet i Sandlådan för att trakassera eller undvika ansvar</li>
          <li>Spam eller otillbörlig självpromotion som inte bidrar till communityn</li>
        </ul>
        <h2>Förväntningarna växer med fasen</h2>
        <p>Ett initiativ i Idé-fas ska kunna vara rått och ofärdigt – här värdesätter vi mod att dela mer än putsad presentation. I takt med att ett initiativ rör sig mot Pilot, Produktion, Etablera, Skala och Impact växer också ansvaret: fler resurser, fler medlemmar och ofta riktiga pengar är involverade, och då väger ärlighet om resultat och ekonomi tyngre.</p>
        <h2>Om något går snett</h2>
        <p>De flesta överträdelser beror på ett dåligt ögonblick eller okunskap om koden, inte illvilja. Om du ser ett beteende som inte känns rätt är första steget ofta att säga till direkt, respektfullt och privat om det går.</p>
        <p>Räcker inte det, eller om situationen är allvarlig (trakasserier, hot, diskriminering, misstänkt bedrägeri), rapportera det istället för att hantera det själv.</p>
        <h2>Rapportera ett problem</h2>
        <p>Kontakta <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a> eller vänd dig direkt till en admin på plattformen. Beskriv vad som hänt och var (vilket initiativ, vilken kommentar), med länkar eller skärmdumpar om möjligt.</p>
        <p>Ärenden som rör ett initiativs innehåll eller kvalitet hanteras normalt av Granskningsrådet. AI-granskning kan flagga uppenbara problem automatiskt, men beslut om åtgärd fattas alltid av människor. Ärenden som rör brott mot stiftelsens stadgar eller misstänkt kriminalitet hanteras av admin, som kan dölja eller stänga av ett initiativ direkt i väntan på utredning.</p>
        <h2>Konsekvenser</h2>
        <p>Beroende på allvarlighetsgrad kan åtgärder innefatta:</p>
        <ol>
          <li>En privat påminnelse om uppförandekoden</li>
          <li>En offentlig varning på initiativet eller profilen</li>
          <li>Indragna eller frysta tokens kopplade till det aktuella initiativet</li>
          <li>Tillfällig avstängning från communityn</li>
          <li>Permanent avstängning och borttagning av initiativ/konto</li>
        </ol>
        <h2>Ett ord om inspiration</h2>
        <p>Den här koden är inspirerad av uppförandekoder inom open source-communityn – till exempel Debians – som visat att enkla, tydliga principer fungerar bättre än långa regelverk. Vi har anpassat den till GoodTribes särskilda sammanhang: en community där riktiga pengar, riktiga insatser och riktiga drömmar står på spel, inte bara kod.</p>
        <p><em>Denna uppförandekod är ett levande dokument och uppdateras i takt med att GoodTribes plattform och community växer.</em></p>
      `.trim(),
    },
    en: {
      title: "GoodTribes Code of Conduct",
      body: `
        <p>GoodTribes exists to help people turn ideas that make the world better into reality – to Do Good, Feel Good, and Live Well. That only works if everyone taking part, in every phase from Idea to Impact, feels safe, respected, and heard.</p>
        <p>This code applies to everyone participating on GoodTribes: Founders, members of a Tribe, volunteers, contributors, and admins – in initiatives, comments, messages, the Sandbox, and at any events GoodTribes hosts.</p>
        <h2>Our principles</h2>
        <ol>
          <li><strong>Be respectful.</strong> You won't always agree – about an idea, a priority, or which phase an initiative belongs in. That's fine. Disagreement is never an excuse for personal attacks or steamrolling someone in your own Tribe.</li>
          <li><strong>Assume good faith.</strong> Most misunderstandings come from unclear communication, not ill intent – especially in early Idea phases where thinking is often unfinished. Ask before assuming someone's intent.</li>
          <li><strong>Give constructive feedback, not just criticism.</strong> If you disagree with an initiative's direction, suggest an alternative or point to a past idea that solved a similar problem. GoodTribes depends on Founders feeling safe enough to share unfinished ideas without being torn down for it.</li>
          <li><strong>Be honest about results and impact.</strong> Impact signals, SDG links, and funds raised all rely on self-reporting – which means GoodTribes depends on people being truthful. Don't overstate an initiative's impact, and don't hide problems, missed goals, or funds used differently than planned.</li>
          <li><strong>Respect anonymity in the Sandbox – but don't abuse it.</strong> The Sandbox is GoodTribes' most open zone, with one exception: anonymous contributions are allowed there as a deliberate departure from our otherwise full transparency. That exception exists to lower barriers to participation, not to avoid accountability – anonymity must never be used to harass, mislead, or dodge responsibility.</li>
          <li><strong>Respect name protection when forking.</strong> Forking an initiative is allowed and part of how GoodTribes is built – but a fork doesn't inherit the original's name or voting weight. Always credit the original and make clear that your fork is a fork, not the original initiative.</li>
          <li><strong>Make room for newcomers.</strong> Everyone was new to their Tribe once. Help explain how phases, tokens, and the Review Council work instead of judging someone for asking the "wrong" questions.</li>
        </ol>
        <h2>What we don't accept</h2>
        <ul>
          <li>Harassment, threats, or hateful language – toward an individual or a group</li>
          <li>Discrimination based on gender, gender identity, sexual orientation, ethnicity, religion, disability, age, or other protected grounds</li>
          <li>Personal attacks, doxxing, or sharing private information without consent</li>
          <li>Deliberately misleading claims about an initiative's purpose, results, finances, or impact signals</li>
          <li>Manipulating GT, Tribe Tokens, or votes to fake support or success that doesn't exist</li>
          <li>Idea theft or plagiarism – presenting someone else's initiative or work as your own without attribution or fork credit</li>
          <li>Passing off a fork as the original initiative, or misusing name protection to mislead</li>
          <li>Abusing Sandbox anonymity to harass others or dodge accountability</li>
          <li>Spam or excessive self-promotion that doesn't contribute to the community</li>
        </ul>
        <h2>Expectations grow with the phase</h2>
        <p>An initiative in the Idea phase should be allowed to be rough and unfinished – we value the courage to share over a polished pitch. As an initiative moves toward Startup, Launch, Establish, Scale, and Impact, responsibility grows too: more resources, more members, and often real money are involved, so honesty about results and finances matters more.</p>
        <h2>If something goes wrong</h2>
        <p>Most violations come from a bad moment or not knowing the code, not ill intent. If you notice behavior that doesn't feel right, the first step is often to say so directly, respectfully, and privately if possible.</p>
        <p>If that's not enough, or the situation is serious (harassment, threats, discrimination, suspected fraud), report it instead of handling it yourself.</p>
        <h2>Reporting a problem</h2>
        <p>Contact <a href="mailto:Info@goodtribes.org">Info@goodtribes.org</a> or reach out directly to an admin on the platform. Describe what happened and where (which initiative, which comment), with links or screenshots if possible.</p>
        <p>Cases about an initiative's content or quality are normally handled by the Review Council. AI review can flag obvious issues automatically, but decisions about action are always made by humans. Cases involving violations of the foundation's bylaws or suspected criminal activity are handled by admins, who may hide or suspend an initiative immediately pending investigation.</p>
        <h2>Consequences</h2>
        <p>Depending on severity, actions may include:</p>
        <ol>
          <li>A private reminder of the code of conduct</li>
          <li>A public warning on the initiative or profile</li>
          <li>Withdrawn or frozen tokens tied to the initiative in question</li>
          <li>Temporary suspension from the community</li>
          <li>Permanent suspension and removal of the initiative/account</li>
        </ol>
        <h2>A note on inspiration</h2>
        <p>This code is inspired by codes of conduct from the open source community – such as Debian's – which have shown that simple, clear principles work better than long rulebooks. We've adapted it to GoodTribes' particular context: a community where real money, real effort, and real dreams are at stake, not just code.</p>
        <p><em>This code of conduct is a living document and will be updated as GoodTribes' platform and community grow.</em></p>
      `.trim(),
    },
  },
};
