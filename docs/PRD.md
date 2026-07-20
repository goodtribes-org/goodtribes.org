# Product Requirements Document
## GoodTribes — Collaborative Impact Platform

**Version:** 2.6 (Draft)
**Datum:** 2026-07-20
**Status:** Under utveckling

**Ändringar i v2.6:**
- §9 MVP-scope uppdaterat: Tribe Tokens & GT (Fas 2.8) flyttat från "Ej inkluderat" till "Inkluderat i MVP" — produkten har redan gått förbi det ursprungliga scopet på den punkten
- Samtliga 10 öppna frågor från v2.5:s kodgranskning triagerade och beslutade (se punkt 10 för fullständiga motiveringar):
  - Google-inloggning — nedprioriterad för nu
  - Idéverkstaden (Fas 1.2) — hög prioritet, nästa gap att bygga
  - Granskningsrådet (Fas 2.97) — blockerar lansering av crowdfunding/vinstdelning
  - `legal_type`/4c-ägarstruktur — blockerar lansering av crowdfunding/vinstdelning
  - Projektchatt (Fas 2.5) — riktig kanalmodell krävs, dagens `kanaler`-redirect till DM räcker inte
  - Impact-fondens ledger (Fas 2.96) — byggs tillsammans med vinstdelningslogiken i 4a
  - E2E-kryptering av DM (5.30/5.31) — kravet nedgraderat till kryptering i vila/transit
  - Idéflödets co-creation & idé→projekt-pipeline (Fas 1.5) — prioritet höjd från "iteration 2"
  - PWA/offline-stöd (5.75) — låg prioritet bekräftad

**Ändringar i v2.5:**
- Nya öppna frågor tillagda i punkt 10, baserade på en kodgranskning som jämförde detta dokument mot nuvarande implementation i `goodtribes-org/goodtribes.org` — se tabellen för detaljer per fas

**Ändringar i v2.4:**
- Tribe Tokens: bytt från timbaserad estimering till prioritetsbaserad poängsättning (låg/normal/hög/bråttom) med lås vid uppgiftsstart
- Ny övergripande GoodTribes Token (GT), separat från projektens lokala Tribe Tokens — se 4c och Fas 2.8
- Ny sektion 4c: Ägarstruktur & juridisk form (kommersiella AB helägda av stiftelsen, ideella projekt under paraply vs. egen förening)
- Ny Fas 2.96: Impact-fond & kapitalomfördelning
- Explicita juridiska gränsdragningar för tokensystemet (ingen växling, ingen inlösen mot pengar)
- Avtalsmallar för kommersiella och ideella projekt finns som separat bilaga (se 4c)

---

## 1. Översikt

GoodTribes är en global plattform som tar användare hela vägen — **från idé till global etablering** — för att göra världen bättre. Plattformen drivs av den ideella stiftelsen GoodTribes och är öppen för privatpersoner, ideella föreningar, stiftelser, företag, offentlig sektor och akademia — så länge deras projekt bidrar till att uppnå Agenda 2030. Plattformen kombinerar AI-driven idégenerering, projekthantering, socialt samarbete, community-matchmaking och crowdfunding i ett sammanhållet system.

**Vision — Leva Gott, Må Gott, Göra Gott**

GoodTribes vill ge alla människor möjlighet att förverkliga sina idéer och sin fulla potential, samtidigt som de bidrar till en långsiktigt hållbar miljö- och samhällsutveckling. Plattformen — "drömfabriken" — utgår från samma goda drivkrafter som driver utvecklingen av fri programvara (öppenhet, samverkan, viljan att bidra och Må Gott/Göra Gott), men ger dessutom alla som bidrar möjligheten att tjäna pengar på sina insatser (Leva Gott).

Plattformen kombinerar det bästa från:
- **GitHub** — transparens, versionshistorik, öppen samarbetskultur
- **Basecamp** — strukturerad projekthantering utan komplexitet
- **Kickstarter** — folkfinansiering kopplad till verkliga projekt
- **Slack / Discord** — realtidskommunikation och community
- **Zoom** — videomöten integrerade direkt i arbetsflödet

---

## 2. Problemformulering

Tre problem GoodTribes vill lösa:

1. Världen behöver en mer långsiktigt hållbar miljö- och samhällsutveckling.
2. Många människor vill medverka till en bättre värld men vet inte hur.
3. Människor vill Leva Gott, Må Gott och Göra Gott i enlighet med FN:s deklaration om de mänskliga rättigheterna, men ges inte den möjligheten.

Idag saknas ett sammanhållet verktyg för människor och organisationer som vill driva meningsfulla projekt globalt. Befintliga verktyg är antingen för tekniska (GitHub), för transaktionsorienterade (Kickstarter), eller för slutna (Basecamp). Ingen plattform kombinerar idégenerering, samarbete, finansiering och skalning under ett tak — med Agenda 2030 som gemensam kompass. GoodTribes fyller det tomrummet.

---

## 3. Målgrupp & Behörighet

GoodTribes är öppen för alla som driver projekt som bidrar till Agenda 2030. Det är projektets syfte — inte organisationsformen — som avgör om det är välkommet på plattformen.

| Aktör | Välkommen om... |
|---|---|
| **Privatpersoner** | Projektet bidrar till minst ett SDG-mål |
| **Ideella föreningar** | Projektet bidrar till minst ett SDG-mål |
| **Stiftelser** | Projektet bidrar till minst ett SDG-mål |
| **Företag** | Projektet bidrar till minst ett SDG-mål och verksamheten är förenlig med Agenda 2030 |
| **Offentlig sektor** (kommuner, regioner, myndigheter) | Projektet bidrar till minst ett SDG-mål |
| **Akademia** (universitet, högskolor, forskningsinstitut) | Projektet bidrar till minst ett SDG-mål |

Projekt som inte kan kopplas till något SDG-mål, eller som aktivt motverkar Agenda 2030, är inte tillåtna på plattformen.

**Tidiga användare — tre drivkrafter**

| Drivkraft | Målgrupp |
|---|---|
| **Göra Gott** | Alla som brinner för att göra världen bättre |
| **Må Gott** | Alla som vill vara med i ett positivt sammanhang där de kan styra sig själva och utveckla sin fulla potential genom att förverkliga egna och andras idéer och drömmar |
| **Leva Gott** | Alla som vill och behöver tjäna pengar och få nya praktiska erfarenheter |

**Kanaler för att nå målgruppen** *(marknadsföring, ej produktkrav)*
- Ungdomar via skolor
- Gerillamarknadsföring
- Internet
- Nätverk med samma mål och intressen

Plattformen är global med stöd för flera språk och valutor.

---

## 4. Kärnvärden

- **Öppenhet** — projekt är synliga och spårbara
- **Samarbete** — rätt person till rätt projekt
- **Ansvar** — tydliga roller, deadlines och progress
- **Impact** — fokus på verklig förändring, inte bara idéer
- **Agenda 2030** — alla projekt kopplas mot FN:s globala mål

**Nyckeltal — hur framgång mäts**

- Antal drömmar/projekt som förverkligas (går från idé till aktiv drift eller slutförande)
- Antal människor som får användning, glädje eller nytta av resultatet

*(Öppen fråga — se punkt 10: exakt definition och mätmetod för dessa nyckeltal är inte specificerad.)*

---

## 4a. Affärsmodell

GoodTribes drivs som en **ideell stiftelse** vars uppdrag är att underlätta förverkligandet av projekt som gör världen bättre. Stiftelsen finansieras genom två intäktsströmmar — ingen prenumeration, inga dolda avgifter.

---

**Intäktsström 1 — Plattformsavgift på insamlade medel**

När ett projekt samlar in pengar via GoodTribes crowdfunding-funktion tar stiftelsen en liten procentandel av det insamlade beloppet.

| Projekttyp | Avgift |
|---|---|
| Ideella föreningar & stiftelser | 3% |
| Privatpersoner | 5% |
| Företag | 7% |

- Avgiften dras automatiskt vid utbetalning via Stripe Connect
- Avgiften visas transparent för både initiativtagare och finansiärer
- Ingen avgift tas om projektet inte når sitt mål (vid allt-eller-inget-modellen)

---

**Intäktsström 2 — Utdelning från kommersiella projekt (helägda AB)**

Kommersiella projekt drivs som aktiebolag, helägda av Stiftelsen (se 4c). Vinst i dessa bolag tillfaller Stiftelsen i sin helhet genom ordinarie utdelning enligt aktiebolagslagen. Fördelningen av överskottet sker därefter i två steg:

**Steg 1 — Styrelseförslag om drift och Impact-fond**
GoodTribes styrelse lägger fram ett förslag om hur stor andel av vinsten som ska gå till **Stiftelsens dagliga drift** respektive **Impact-fonden** (se Fas 2.96). Projektets Tribe Token-innehavare röstar om förslaget, proportionellt mot sitt tokeninnehav (se Fas 2.95). Styrelsen har vetorätt om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet.

**Steg 2 — Individuell fördelning av resterande andel**
Den andel som blir kvar efter drift och Impact-fond fördelas till varje bidragsgivare proportionellt mot dennes Tribe Token-innehav i det vinstgivande projektet. Varje person väljer sedan **själv** vilket eller vilka projekt på goodtribes.org de vill rikta sin andel till — inklusive möjligheten att stödja sitt eget projekts fortsatta utveckling, eller andra projekt de vill se lyckas. Görs inget aktivt val inom en fastställd tidsram (t.ex. 30 dagar) går andelen automatiskt till Impact-fonden.

- Steg 1 sker inom ramen för det delegerade mandat Stiftelsen ger enligt delegations- och anslutningsavtalet (se 4c)
- Steg 2 är ett personligt val och kräver ingen ytterligare omröstning — pengarna tillhör redan bidragsgivaren, frågan är bara vilket projekt de ska stödja
- Vinstdelande projekt markeras med ett "For-profit" märke på projektsidan — full transparens

---

**Intäktsström 3 — Partnerskap, sponsring och externa medel**

Utöver plattformsavgifter och vinstdelning finansieras Stiftelsen även genom:

- **Sponsorer** — företag och organisationer som stödjer plattformen
- **Partners** — myndigheter, näringsliv, stiftelser och skolor (kopplat till offentlig sektor/akademia, se sektion 3)
- **Fonder** — ansökningar om extern finansiering till verksamheten
- **Föredrag & utbildning** — intäkter kopplade till kunskapsspridning om GoodTribes arbetssätt

*(Öppen fråga — se punkt 10: exakt struktur, villkor och prissättning för dessa intäktsströmmar är inte specificerade.)*

---

**Vad intäkterna används till:**

- Drift och vidareutveckling av plattformen
- AI-kostnader (estimering, agenter, matchmaking)
- GoodTribes Academy — gratis utbildningsresurser
- Mentorsprogram
- Stöd till projekt i låginkomstländer (subventionerad eller gratis användning)
- Transparensrapport publiceras årligen

---

**Vad GoodTribes aldrig gör:**

- Säljer användardata
- Tar betalt för grundläggande funktioner
- Tar avgift från projekt som inte genererar intäkter

---

**Juridiska överväganden:**

- Stiftelsen registreras i Sverige och lyder under svensk stiftelselag
- Delegations- och anslutningsavtal (för AB, se 4c) samt verksamhetsavtal (för ideella projekt under paraplyet, se 4c) behöver juridisk granskning per jurisdiktion för internationella projekt — den svenska helägda-AB-modellen har inte nödvändigtvis en direkt motsvarighet utomlands *(öppen fråga, se punkt 10)*
- Plattformsavgiften på crowdfunding kräver inga extra tillstånd i Sverige — sedan finansiärer får Tribe Tokens istället för aktier (se Fas 3, 5.56) krävs inte Finansinspektionens tillstånd för equity-crowdfunding
- GDPR-efterlevnad säkerställs för alla EU-användare

**Databasutökning — affärsmodell:**
```
project_revenue_agreements
  id, project_id, project_type (nonprofit | individual | forprofit)
  platform_fee_percent
  delegation_agreement_signed_at, delegation_agreement_signed_by

platform_fee_transactions
  id, campaign_id, amount_collected, fee_percent, fee_amount
  paid_out_at, created_at

profit_distributions
  id, project_id, period, audited_profit
  foundation_operations_share_percent, impact_fund_share_percent
  remaining_share_percent, decided_by_poll_id
  status (pending | transferred), created_at

personal_profit_allocations
  id, user_id, source_project_id, distribution_id, amount_available_sek
  allocation_deadline, target_project_id (nullable tills valt, null → Impact-fonden vid deadline)
  amount_allocated_sek, related_stripe_transfer_id, allocated_at, created_at
```

---

## 4b. Autentisering & Åtkomstnivåer

**Teknisk lösning: Supabase Auth**
Integrerar direkt med databasen, hanterar sessioner och JWT-tokens automatiskt och stödjer Row Level Security — varje användare ser och kan bara påverka det de har rätt till.

---

**Inloggningsmetoder (prioritetsordning):**

| Metod | Prioritet | Motivering |
|---|---|---|
| Google | MVP | Lägst tröskel, störst räckvidd |
| Magic link (e-post) | MVP | Inget lösenord att glömma |
| LinkedIn | Fas 2 | Relevant för organisationer och professionella |
| E-post + lösenord | Fas 2 | För användare utan Google-konto |
| GitHub | Framtid | Relevant för tekniska projekt |

---

**Åtkomstnivåer — vad kräver inloggning:**

| Handling | Inloggning krävs |
|---|---|
| Läsa projektsidor | ❌ Öppet för alla |
| Läsa blogginlägg | ❌ Öppet för alla |
| Läsa wiki | ❌ Öppet för alla |
| Bläddra i idéflödet | ❌ Öppet för alla |
| Filtrera och söka projekt | ❌ Öppet för alla |
| Använda idégenereringsverktyget | ✅ Kräver inloggning |
| Rösta på idéer | ✅ Kräver inloggning |
| Kommentera | ✅ Kräver inloggning |
| Skapa projekt | ✅ Kräver inloggning |
| Bidra till projekt | ✅ Kräver inloggning |
| Skapa uppgifter | ✅ Kräver inloggning |
| Starta crowdfunding | ✅ Kräver inloggning |
| Skicka meddelanden | ✅ Kräver inloggning |
| Tjäna Tribe Tokens | ✅ Kräver inloggning |
| Rösta i projektomröstningar | ✅ Kräver inloggning |

---

**Registreringsflöde:**

**Steg 1 — Välj inloggningsmetod**
Google-knapp eller e-postfält för magic link. Enkel, ren sida utan distraktion.

**Steg 2 — Bekräfta e-post**
Vid magic link: klicka på länk i mejlet. Vid Google: direkt vidare.

**Steg 3 — Skapa profil (första gången)**
- Visningsnamn (obligatoriskt)
- Profilbild (valfritt — Google-bild används om tillgänglig)
- Land / region (valfritt — används för matchmaking och lokal discovery)
- Kompetenser (valfritt — välj från lista, kan läggas till senare)
- Intressen / SDG-mål man brinner för (valfritt)

Steg 3 kan hoppas över och fyllas i senare från profilen.

**Efter registrering:**
- Användaren landar på sin Workplace
- Onboarding-guide startar automatiskt (Fas 5)
- Välkomstmejl skickas

---

**Säkerhet:**
- Row Level Security (RLS) i Supabase — databas-nivå, inte bara API-nivå
- Sessioner hanteras automatiskt av Supabase Auth
- GDPR-samtycke inhämtas vid registrering
- Tvåfaktorsautentisering (2FA) — tillgänglig som valfritt alternativ för användare

**Databasutökning:**
```
profiles (utökar Supabase auth.users)
  id (= auth.users.id), display_name, avatar_url, country
  skills[], interests[], bio, created_at, updated_at

user_consents
  id, user_id, type (gdpr | marketing | cookies), accepted, created_at
```

---

## 4c. Ägarstruktur & juridisk form

Varje projekt på GoodTribes är operativt självständigt — styrt av sin initiativtagare och sina medlemmar genom Tribe Tokens-röstning (se Fas 2.95) — men den juridiska formen skiljer sig beroende på om projektet är kommersiellt eller ideellt.

---

**Kommersiella projekt — helägda aktiebolag**

- Varje kommersiellt projekt drivs som ett fristående aktiebolag, till 100% ägt av Stiftelsen GoodTribes.
- Ansvarsisolering: ett projekts konkurs eller juridiska problem slår inte igenom till Stiftelsen eller andra projekt.
- Stiftelsen delegerar, som ensam aktieägare, det löpande operativa beslutsmandatet (produktriktning, prioritering, mindre budgetbeslut) till projektets Tribe Token-röstning.
- Stiftelsen behåller alltid vetorätt i frågor om: byte av styrelse/vd, ändring av bolagsordning, större investeringar, varumärkesanvändning, samt frågor som utgör juridisk eller finansiell risk — inklusive vetorätt över fördelningen av vinstutdelning (se 4a) om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet.
- Vinst går som utdelning till Stiftelsen. Projektets Tribe Token-innehavare röstar därefter, proportionellt mot sitt tokeninnehav, om hur överskottet fördelas — t.ex. andel till Impact-fonden, andel till projektets eget vinstdelningsprogram, eller reinvestering (se 4a och Fas 2.96).
- Regleras genom ett **delegations- och anslutningsavtal** mellan Stiftelsen och respektive AB (se separat avtalsmall).

**Ideella projekt — två nivåer**

| Nivå | Beskrivning | Passar för |
|---|---|---|
| Under Stiftelsens paraply | Ingen egen juridisk person. Stiftelsen är juridisk huvudman, hanterar alla medel och bär det yttersta ansvaret. Projektledaren saknar egen firmateckningsrätt. | Nystartade, mindre initiativ |
| Egen ideell förening | Full autonomi, eget organisationsnummer, egen styrelse och bankkonto. | Projekt som vuxit i omfattning och medlemsantal |

- Projekt under paraplyet regleras genom ett **verksamhetsavtal** med Stiftelsen (se separat avtalsmall) som reglerar ekonomisk hantering, beslutsmandat och ansvar.
- Stiftelsen fastställer tröskelvärden (t.ex. antal aktiva medlemmar, ekonomisk omsättning) för när ett projekt kan ansöka om att knoppas av till egen förening. *(Öppen fråga — se punkt 10: exakta tröskelvärden ej beslutade.)*

**Övergång mellan juridisk form**

- Projektets medlemmar kan rösta, viktat mot Tribe Token-innehav (se Fas 2.95), om att föreslå en ändring av `legal_type` — t.ex. från ideellt till kommersiellt eller tvärtom.
- Ett godkänt röstresultat är en **begäran**, inte en automatisk ändring: Stiftelsen genomför den faktiska juridiska övergången, eftersom den kräver verkliga steg (bilda eller avveckla ett aktiebolag, teckna nytt avtal enligt 4c, hantera eventuella skattekonsekvenser).
- Vid övergång från ideellt till kommersiellt: ett nytt aktiebolag bildas, helägt av Stiftelsen, och ett delegations- och anslutningsavtal tecknas enligt ovan.
- Vid övergång från kommersiellt till ideellt: Stiftelsen (som redan äger bolaget till 100%) beslutar om avveckling eller ombildning av det befintliga AB:et, i samråd med projektets medlemmar.
- Stiftelsen kan avslå en begäran om övergång om den bedöms medföra oskälig juridisk, ekonomisk eller skattemässig risk.
- *(Öppen fråga — se punkt 10: exakt tidsram och process för hur Stiftelsen hanterar en godkänd övergångsbegäran är inte specificerad.)*

**Databasutökning**
```
legal_type_change_requests
  id, project_id, requested_type (commercial_ab | nonprofit_umbrella | nonprofit_own_assoc)
  poll_id, status (pending | approved_by_members | executed | rejected_by_foundation)
  decided_at, executed_at, created_at
```

**Juridiska principer som gäller oavsett projektform**

- Inga tokens (Tribe Tokens eller GT) representerar ägande, aktier eller är fritt överlåtbara — se Fas 2.8.
- Allt faktiskt penningflöde (utdelning, donationer, ersättningar) sker i vanlig valuta via Stripe Connect, aldrig som en tokentransaktion.
- Avtalsmallar för båda projekttyperna finns som separat bilaga till detta dokument (`avtal/kommersiellt-projekt-mall.docx` och `avtal/ideellt-projekt-mall.docx`) och ska granskas av jurist per projekt innan signering.

---

## 5. Features — Prioritetsordning

### Fas 1 — Projekthantering (MVP)

Målet är att ge initiativtagare ett kraftfullt men enkelt verktyg för att driva sitt arbete.

**5.1 Projektsida**
- Titel, beskrivning, kategori och taggar
- Projektbild / banner
- Status: Idé / Aktiv / Avslutad
- Offentlig eller privat synlighet
- **Agenda 2030-mål** — visuella symboler som visar vilka av FN:s 17 globala mål projektet kopplas mot

**5.2 Agenda 2030-integration**

Varje projekt kopplas mot ett eller flera av FN:s 17 globala hållbarhetsmål (SDG). Målen visas som färgkodade ikoner direkt på projektsidan — samma officiella symboler som FN använder.

*De 17 målen:*

| # | Mål | Färg |
|---|---|---|
| 1 | Ingen fattigdom | Röd |
| 2 | Ingen hunger | Gul |
| 3 | God hälsa och välbefinnande | Grön |
| 4 | God utbildning | Röd |
| 5 | Jämställdhet | Orange |
| 6 | Rent vatten och sanitet | Blå |
| 7 | Hållbar energi | Gul |
| 8 | Anständiga arbetsvillkor | Vinröd |
| 9 | Hållbar industri och innovation | Orange |
| 10 | Minskad ojämlikhet | Rosa |
| 11 | Hållbara städer | Orange |
| 12 | Hållbar konsumtion | Mörkgul |
| 13 | Bekämpa klimatförändringen | Grön |
| 14 | Hav och marina resurser | Blå |
| 15 | Ekosystem och biologisk mångfald | Mörkgrön |
| 16 | Fredliga och inkluderande samhällen | Mörkblå |
| 17 | Genomförande och globalt partnerskap | Mörkblå |

*Funktionalitet:*
- Initiativtagaren väljer 1–5 relevanta mål vid projektskapande och kan uppdatera dem senare
- **AI-förslag** — baserat på projektbeskrivningen föreslår AI vilka mål som är mest relevanta
- Ikonerna visas prominent på projektsidan under projektnamnet
- Varje ikon är klickbar — visar en kort beskrivning av målet och hur projektet kopplar till det
- I discovery kan användare filtrera projekt per SDG-mål
- Fondkatalogen (Fas 3.5) matchar automatiskt mot fonder som finansierar specifika SDG-mål
- GoodTribes startsida visar ett globalt SDG-dashboard: hur många projekt arbetar mot varje mål

*Teknisk implementation:*
```javascript
// SDG-förslag via Claude API
{
  model: "claude-sonnet-4-6",
  system: `Du är expert på FN:s Agenda 2030. 
           Analysera projektbeskrivningen och returnera JSON:
           { "suggested_sdgs": [1, 13, 15], "reasoning": string }
           Returnera max 5 SDG-nummer, sorterade efter relevans.`,
  messages: [{ role: "user", content: project.description }]
}
```

*Databasutökning:*
```
project_sdgs
  id, project_id, sdg_number (1-17), added_by, created_at

sdg_descriptions
  id, sdg_number, title_sv, title_en, color_hex, icon_url, description_sv, description_en
  (statisk tabell — fylls i vid lansering)
```

**5.3 Skapa nytt projekt**

Alla inloggade användare kan skapa ett nytt projekt när som helst via en tydlig "Skapa projekt"-knapp tillgänglig i navigationen och på Workplace.

*Skapandeflöde — tre steg:*

**Steg 1 — Grundinfo**
- Projektnamn (obligatoriskt)
- Kort beskrivning (obligatoriskt, max 280 tecken — visas i discovery)
- Kategori (välj från lista: Teknik / Miljö / Utbildning / Konst / Samhälle / Övrigt)
- Taggar (fritext, max 5)
- **Agenda 2030-mål** — AI föreslår baserat på beskrivningen, initiativtagaren bekräftar eller justerar
- **Juridisk form** (`legal_type`, se 4c): Kommersiellt (helägt AB) / Ideellt (under Stiftelsens paraply) / Ideellt (egen förening). Avgör vilket avtal som gäller för projektet (delegations- och anslutningsavtal eller verksamhetsavtal, se 4c).

**Steg 2 — Inställningar**
- Synlighet: Öppet (vem som helst kan gå med) eller Slutet (kräver godkännande)
- Projektbild / banner (valfritt — platshållarbild används annars)
- Längre projektbeskrivning i markdown-editor (valfritt — kan fyllas i senare)

**Steg 3 — Bjud in medlemmar**
- Bjud in via e-post eller användarnamn (valfritt — kan göras senare)
- Hoppa över och gå direkt till projektet

*Efter skapandet:*
- Användaren blir automatiskt Ägare
- Kanban-board, chatt, wiki och blogg skapas automatiskt
- Projektet visas direkt på användarens Workplace under "Mina projekt"
- Om synlighet är Öppet indexeras projektet i discovery omedelbart
- Vid kommersiell eller ideell juridisk form skickas relevant avtalsmall (se 4c) för granskning och signering innan projektet kan ta emot pengar via crowdfunding eller Impact-fonden — projektet kan användas fullt ut för planering och samarbete under tiden

**5.4 Uppgiftshantering — Unified Task System**

Ett enda sammanhållet system för alla typer av uppgifter i projektet. Användaren väljer själv om de vill jobba i Kanban-vy eller listvy — datan är densamma, bara presentationen skiljer sig.

**Vyer:**
- **Kanban-vy** — kolumner med drag-and-drop, bra för visuell överblick
- **Listvy (todo)** — kompakt checklisteformat, bra för snabb hantering
- Användaren kan växla fritt mellan vyerna — inget data går förlorat

**Uppgiftskort — alla fält:**
- Titel (obligatoriskt)
- Beskrivning (valfritt, markdown)
- Ansvarig (valfri tilldelning till projektmedlem)
- Deadline (valfritt)
- Prioritet: Låg / Normal / Hög / Bråttom (avgör tokenvärde, se Fas 2.8)
- Status: Att göra / Pågår / Granskning / Klart
- Grupperbar i namngivna listor (t.ex. "Sprint 1", "Möte 2026-07-01")
- Bifoga filer och länkar

**Prioritet och lås:**
- Initiativtagaren eller admin sätter prioritet vid skapande — se Fas 2.8 (5.32) för fullständig logik kring låsning och tokenvärde
- Prioriteten kan ändras fritt medan uppgiften ligger i "Att göra", men låses automatiskt när den flyttas till "Pågår"
- Gäller oavsett om uppgiften skapas som ett Kanban-kort eller en snabb todo-punkt

**Tokens:**
- Alla godkända uppgifter ger Tribe Tokens enligt sin låsta prioritet: Låg = 10, Normal = 20, Hög = 30, Bråttom = 40 (se Fas 2.8)
- Ingen minimitröskel — även den minsta uppgiften ger sitt fulla prioritetsvärde när den godkänns

**AI-agent:**
- Knappen "Tilldela AI" finns på alla uppgifter (text och research)
- Tribe Tokens för AI-utförda uppgifter går till GoodTribes (se Fas 2.9, 5.41)

**Databasutökning — unified tasks:**
```
task_groups
  id, project_id, title, sort_order, created_by, created_at

tasks
  id, project_id, task_group_id, title, description_markdown
  assignee_id, deadline, priority (low | normal | high | urgent)
  status (todo | in_progress | review | done)
  priority_locked_at (timestamp, null tills uppgiften påbörjas)
  created_by, created_at, updated_at, completed_at
```


**5.5 Roller & behörigheter**

Varje projekt är en självständig enhet med egen medlemshantering. Initiativtagaren har full kontroll över vem som är med och vad de får göra.

**Rollhierarki:**

| Roll | Beskrivning |
|---|---|
| **Initiativtagare** | Personen som startade projektet. Fullständig kontroll. Kan inte tas bort av andra medlemmar i projektet — men kan uteslutas av GoodTribes Granskningsråd vid grov misskötsel eller regelbrott (se Fas 2.97). *Notera: rollen innebär ansvar och mandat att leda projektet, inte juridiskt ägarskap — se 4c för hur äganderätten faktiskt är strukturerad.* |
| **Admin** | Utsedd av initiativtagaren. Samma rättigheter som initiativtagaren förutom att ta bort projektet eller initiativtagaren själv. |
| **Medarbetare** | Kan skapa och redigera uppgifter, delta i chatt, forum och röstningar. |
| **Följare** | Kan se projektet och kommentera. Ingen redigeringsrätt. |
| **Granskare** | Specifik roll för att granska och godkänna AI-utförda uppgifter. |

**Initiativtagarens rättigheter:**
- Bjuda in användare via e-post eller användarnamn
- Ta bort medlemmar från projektet
- Ändra roll för alla medlemmar (utom sig själv)
- Delegera admin-rättigheter till en eller flera medarbetare
- Godkänna eller avslå ansökningar om att gå med i projektet
- Stänga projektet för nya medlemmar
- Arkivera eller ta bort projektet

**Adminens rättigheter (delegerade av initiativtagaren):**
- Bjuda in och ta bort medarbetare och följare
- Ändra roller för medarbetare och följare
- Hantera Kanban, milstolpar och omröstningar
- Kan inte ta bort initiativtagaren eller andra admins
- Kan inte ta bort eller arkivera projektet

**Medlemshantering:**
- Initiativtagaren kan sätta projektet som öppet (vem som helst kan gå med) eller slutet (kräver godkännande)
- Ansökningar om att gå med visas i en kö för initiativtagaren/admin att godkänna eller avslå
- Borttagna medlemmar förlorar åtkomst omedelbart men behåller sina intjänade tokens
- Inbjudningar skickas via e-post med en tidsbegränsad länk (48h)

**Efterträdare — när initiativtagaren vill lämna**
- Initiativtagaren kan när som helst signalera att de vill lämna rollen
- Projektets medlemmar röstar fram en efterträdare genom en Tribe Token-viktad omröstning (se Fas 2.95), på samma sätt som övriga projektbeslut
- Initiativtagaren kan nominera en kandidat, men rösten avgör — nomineringen är inte bindande
- Fram till att en efterträdare är vald och bekräftad behåller den avgående initiativtagaren rollen, för att undvika ett ledarskapsvakuum
- Skiljer sig från uteslutning via Granskningsrådet (Fas 2.97): detta är ett frivilligt, planerat maktskifte, inte en disciplinär åtgärd
- *(Öppen fråga — se punkt 10: vad händer om ingen kandidat får majoritet, eller om initiativtagaren lämnar utan att en efterträdare hunnit väljas?)*

**Databasutökning:**
```
project_members
  id, project_id, user_id
  role (initiator | admin | collaborator | follower | reviewer)
  invited_by, joined_at, removed_at

project_invitations
  id, project_id, invited_by, email, role, token, expires_at, accepted_at

project_join_requests
  id, project_id, user_id, message, status (pending | approved | rejected)
  reviewed_by, reviewed_at, created_at

initiator_succession_polls
  id, project_id, initiated_by, nominated_candidate_id (nullable)
  poll_id, status (open | resolved | expired), resolved_at, new_initiator_id
```

**5.6 Aktivitetsflöde**
- Logg över ändringar, kommentarer och milstolpar
- @-omnämnanden och notifikationer

**5.7 Milstolpar & roadmap**
- Tidslinje med faser
- Koppling mellan milstolpar och uppgifter

**5.8 Projektblogg**

En publik blogg kopplad till projektet där initiativtagare och admins kan publicera uppdateringar, nyheter och reflektioner.

- Inlägg skrivs i markdown med rich text-editor
- Stöd för bilder, inbäddade videolänkar och filbilagor
- Inlägg kan vara publika (synliga för alla) eller interna (bara medlemmar)
- Kommentarer på inlägg — öppna för alla eller bara medlemmar
- Trådade svar (kommentera på en kommentar)
- @-omnämnanden i kommentarer triggar notifikation
- Reaktioner på kommentarer (👍 💡 ❤️ etc.)
- Kommentarer kan markeras som "Bästa kommentar" av författaren
- Redigera och ta bort egna kommentarer
- Rapportera olämpliga kommentarer
- RSS-flöde per projekt så att följare kan prenumerera
- AI-assistans: generera utkast baserat på projektets senaste aktivitet ("Skriv en veckouppdatering")
- Inlägg visas i plattformens globala flöde och lyfter projektets synlighet

**Databasutökning — blogg:**
```
blog_posts
  id, project_id, author_id, title, slug, body_markdown, status (draft | published)
  visibility (public | members), published_at, created_at, updated_at

blog_comments
  id, blog_post_id, parent_id, author_id, body, edited_at, created_at

blog_comment_reactions
  id, blog_comment_id, user_id, emoji, created_at
```

**5.9 Projektwiki**

En strukturerad kunskapsbank för projektet — dokumentation, beslutslogg, processer och referensmaterial som byggs upp över tid.

- Trädstruktur med sidor och undersidor (som Notion eller GitHub Wiki)
- Markdown-editor med live-preview
- Versionshistorik — se alla ändringar och återställ tidigare versioner
- Vem som helst i projektet kan redigera (med rollbaserade undantag om initiativtagaren vill låsa sidor)
- Sidor kan länkas till uppgifter, milstolpar och blogg-inlägg
- Sökbar inom projektet
- **Inline-kommentarer** — markera ett textstycke och lämna en kommentar direkt i texten (som Google Docs)
- Kommentarer på wiki-sidor visas i marginalen bredvid relevant stycke
- Trådade svar på inline-kommentarer
- Kommentarer kan markeras som "Löst" och kollapsar automatiskt
- @-omnämnanden i kommentarer triggar notifikation
- AI-assistans: "Sammanfatta alla beslut vi tagit hittills" genererar ett wiki-utkast från forumtrådar och omröstningar
- Startsidan är projektets "README" — visas för alla som besöker projektet

**Databasutökning — wiki:**
```
wiki_pages
  id, project_id, parent_id, title, slug, body_markdown
  created_by, last_edited_by, locked (bool), created_at, updated_at

wiki_revisions
  id, wiki_page_id, edited_by, body_markdown, diff, created_at

wiki_comments
  id, wiki_page_id, parent_id, author_id, body
  anchor_text, anchor_position, resolved (bool)
  edited_at, created_at

wiki_comment_reactions
  id, wiki_comment_id, user_id, emoji, created_at
```

---

### Fas 1.2 — Kollaborativ Idégenerering

Målet är att hjälpa inloggade användare gå från ett vagt problem till en konkret projektidé — tillsammans med andra användare och med AI som stöd. Poängen är att människor bollar idéer med varandra, inte att AI genererar allt ensam.

**Kräver inloggning.** Verktyget är tillgängligt för alla registrerade användare — inte öppet för anonyma besökare.

---

**5.10 Idéverkstaden — kollaborativt rum**

Idéverkstaden är ett öppet rum där inloggade användare kan posta problem de vill lösa, få input från andra användare och tillsammans förfina idéer med AI som stöd.

*Tillgängligt på två ställen:*
- **Idéverkstaden** — en dedikerad sida i navigationen, öppen för alla inloggade
- **Inne i ett projekt** — knappen "Starta idésession" för att generera nya angreppssätt med projektets medlemmar

---

**Flöde — kollaborativ idésession:**

**Steg 1 — Posta ett problem**
Inloggad användare beskriver ett problem de vill lösa i fritext. Inget formulär — bara ett fält: *"Vilket problem vill du lösa?"*

Posten publiceras i Idéverkstaden och blir synlig för alla inloggade användare.

**Steg 2 — Andra användare bidrar**
- Andra användare kan kommentera och ställa frågor: *"Har du kollat om det finns liknande initiativ i Asien?"*
- Användare kan föreslå idéer direkt i tråden
- Reaktioner (👍 💡 🌍) för att lyfta lovande inriktningar
- Tråden är konversationell — mer som ett brainstorming-rum än ett kommentarsfält

**Steg 3 — Bjud in AI som deltagare**
När som helst i konversationen kan vem som helst i tråden skriva `@AI` för att bjuda in AI som en aktiv deltagare:
- `@AI vad finns det för liknande initiativ globalt?`
- `@AI kan du generera tre projektidéer baserade på diskussionen hittills?`
- `@AI vilka SDG-mål är mest relevanta för det här problemet?`

AI läser hela trådens konversationshistorik och svarar kontextuellt — som en välinformerad kollega, inte ett verktyg man fyller i formulär för.

**Steg 4 — Förfina en idé tillsammans**
- Vem som helst kan lyfta fram en specifik idé för gemensam förfining: *"Jag gillar förslaget om mobilkliniker — kan vi bygga vidare på det?"*
- AI kan på begäran expandera en idé med: projektnamn, lösningsbeskrivning, första åtgärd, inspirationsprojekt, svårighetsgrad och SDG-koppling
- Tråden fortsätter tills initiativtagaren är nöjd

**Steg 5 — Spara och agera**
- En idé kan sparas till Idéflödet (Fas 1.5) för vidare community-feedback
- Eller konverteras direkt till ett nytt projekt — med AI som automatiskt genererar projektbeskrivning, milstolpar och startuppgifter
- Alla som deltagit i tråden notifieras när ett projekt skapas och erbjuds att gå med

---

**Inne i ett befintligt projekt:**
- Projektmedlemmar kan starta en intern idésession
- Bara projektmedlemmar ser och deltar
- AI har tillgång till projektets befintliga kontext: beskrivning, milstolpar, uppgifter och wiki
- Används för: lösa utmaningar, hitta nya angreppssätt, planera nästa fas

---

**5.11 Teknisk implementation**

```javascript
// AI som deltagare i konversationen — läser hela tråden
{
  model: "claude-sonnet-4-6",
  system: `Du är en kreativ problemlösare och projektdesigner med djup kunskap 
           om globala samhällsutmaningar, social innovation och Agenda 2030.
           Du deltar i en kollaborativ idédiskussion som en av flera deltagare.
           Var koncis, inspirerande och bygg vidare på vad andra redan sagt.
           Svara alltid på det språk som används i konversationen.
           Projektkontext: ${project?.description ?? 'Allmän idédiskussion'}`,
  messages: threadMessages // hela tråden inkl. alla användares inlägg
}
```

**5.12 Databasutökning — idégenerering**

```
idea_threads
  id, author_id, project_id (null om i Idéverkstaden), title
  problem_description, status (open | developing | converted)
  converted_to_project_id, created_at

idea_thread_messages
  id, thread_id, author_id, is_ai (bool), body
  parent_id, created_at

idea_thread_reactions
  id, thread_id, message_id, user_id, emoji, created_at

idea_thread_participants
  id, thread_id, user_id, joined_at
```

---

### Fas 1.5 — Öppen Innovation

Målet är att låta vem som helst bidra med idéer och forma dem tillsammans — innan de blir formella projekt. Detta är plattformens "idéinkubator" och en central differentiator mot konkurrenter.

**5.13 Idéflöde (Ideas Feed)**
- Öppet för alla — ingen inloggning krävs för att läsa
- Vem som helst kan posta en idé med titel, beskrivning och kategori
- Idéer är sökbara och filtrerbara per kategori, popularitet och datum
- Varje idé får en unik publik URL som kan delas

**5.14 Feedback & röstning**
- Tumme upp / tumme ner eller poängsystem (t.ex. 1–5)
- Kommentarsfält med trådade svar
- "Byggande kommentarer" — markera sitt inlägg som konstruktivt förslag
- Populäraste idéerna lyfts i ett topplistflöde

**5.15 Co-creation**
- Vem som helst kan föreslå ändringar i en idés beskrivning (pull request-liknande)
- Initiativtagaren godkänner eller avvisar förslag
- Versionshistorik — se hur idén utvecklats över tid
- Flera bidragsgivare kan listas som medförfattare

**5.16 Idé → Projekt-pipeline**
- En idé kan med ett klick "befordras" till ett formellt projekt
- Idéns beskrivning, kategori och bidragsgivare följer med automatiskt
- Bidragsgivare till idén notifieras och erbjuds att gå med i projektet
- Idésidan arkiveras och länkas till det nya projektet ("Ursprung: Idé #42")

**5.17 Databasutökning för idéer**

```
ideas
  id, title, description, category, author_id, status (open | promoted | archived)
  created_at, promoted_to_project_id

idea_votes
  id, idea_id, user_id, value (+1 | -1), created_at

idea_comments
  id, idea_id, parent_id, author_id, body, type (comment | suggestion), created_at

idea_revisions
  id, idea_id, proposed_by, diff, status (pending | accepted | rejected), created_at

idea_contributors
  id, idea_id, user_id, role (author | co-author | contributor)
```

---

### Fas 2 — Community & Matchmaking

Målet är att koppla ihop rätt personer med rätt projekt.

**5.18 Användarprofiler**
- Kompetenser, intressen och tillgänglighet
- Portfolio av tidigare projekt
- Verifieringsmärken (t.ex. "Verified Organization")

**5.19 Workplace — Användarens hemmaplan**

En personlig dashboard som ger varje användare full översikt över sitt engagemang på plattformen. Nås via en fast länk i navigationen och är bara synlig för användaren själv (och admins).

*Mina projekt*
- Lista över alla projekt användaren är medlem i, grupperade per roll (Initiativtagare / Admin / Medarbetare / Följare)
- Varje projektkort visar: namn, status, antal öppna uppgifter, senaste aktivitet och intjänade tokens
- **Token-poäng per projekt** visas tydligt på varje kort — både användarens egna poäng och den totala poängfördelningen i projektet
- Rankning: "Du är #3 av 12 bidragsgivare i detta projekt"
- Snabblänk till projektets Kanban, chatt och wiki direkt från kortet
- Filtrera per roll, status eller senaste aktivitet

*Mina uppgifter*
- Samlad lista över alla uppgifter användaren är tilldelad — tvärs alla projekt
- Grupperade per projekt eller sorterade efter deadline
- Statusfilter: Att göra / Pågår / Granskning / Klart
- Flagga uppgifter som prioriterade
- Klicka på en uppgift för att gå direkt till rätt projekt och Kanban-kort
- AI-påminnelse: flaggar uppgifter med passerad deadline eller som legat i "Pågår" för länge

*Min aktivitet*
- Tidslinje över senaste handlingar: godkända uppgifter, kommentarer, röster, wiki-redigeringar
- **Token-översikt:**
  - Totalt intjänade tokens (alla projekt summerade)
  - Uppdelning per projekt i ett stapeldiagram
  - Graf över tokens intjänade över tid — vecka / månad / totalt
  - Pågående tokens (ej godkända än) visas separat i grått

*Notifikationer*
- Samlad inbox för alla notifikationer tvärs alla projekt
- Filtrera per projekt eller typ (uppgift, chatt, omröstning, kommentar)

*Snabbåtgärder*
- Skapa ett nytt projekt
- Hitta projekt att gå med i (länk till discovery)
- Starta ett privat meddelande

**Databasutökning — workplace:**
```
-- Workplace är en vy, inte en ny tabell
-- Byggs upp av joins mot: project_members, tasks, token_ledger,
-- notifications, activity_log
-- Ingen extra databasstruktur behövs utöver befintliga tabeller
```

**5.20 Global sökning**

En kraftfull sökfunktion tillgänglig från navigationen på alla sidor — ett sökfält som når tvärs hela plattformen med ett enda anrop.

*Sökbar innehåll:*

| Typ | Vad som söks | Synlig för |
|---|---|---|
| **Projekt** | Namn, beskrivning, taggar, SDG-mål | Alla |
| **Idéer** | Titel, beskrivning, kategori | Alla |
| **Användare** | Namn, kompetenser, bio | Alla |
| **Organisationer** | Namn, beskrivning | Alla |
| **Blogginlägg** | Titel, innehåll | Alla (publika) |
| **Wiki-sidor** | Titel, innehåll | Alla (publika) + medlemmar (privata) |
| **Uppgifter** | Titel, beskrivning | Projektmedlemmar |

*Funktionalitet:*
- **Snabbsökning** — resultaten visas direkt i en dropdown medan användaren skriver, grupperade per typ
- **Fullständig söksida** — tryck Enter för djupare resultat med filter och sortering
- **Filter på söksidan:** typ, SDG-mål, kategori, land/region, aktiv/avslutad, datum
- **Sortering:** Relevans / Senast aktiv / Mest populär / Närmast geografiskt
- **Semantisk sökning** — AI förstår intent, inte bara exakta ord. "klimat energi afrika" hittar relevanta projekt även om de exakta orden inte finns i titeln
- Sökresultat är personaliserade om användaren är inloggad — egna projekt och intressen viktas upp
- Sökhistorik sparas lokalt för inloggade användare
- Populära sökningar visas som förslag

*Teknisk implementation:*
- **Supabase Full-Text Search** för grundläggande textsökning (PostgreSQL tsvector)
- **pgvector** för semantisk sökning via AI-genererade embeddings
- Sökindex uppdateras automatiskt när innehåll skapas eller ändras

```
search_index (hanteras av pgvector + Supabase FTS)
  id, content_type, content_id, title, body, embedding (vector)
  project_id, visibility, language, updated_at
```

**5.21 Projektdiscovery**
- Dedikerad discovery-sida för att utforska projekt
- Visuellt kortformat med projektbild, SDG-ikoner, bidragsgivarantal och aktivitetspuls
- Filtrera per: SDG-mål, kategori, land, projektstatus, organisationstyp
- Rekommendationsmotor baserad på profil och historik för inloggade användare
- Karta-vy — se projekt geografiskt fördelade över världen

**5.22 Matchmaking**
- Projekt kan efterlysa specifika kompetenser
- AI föreslår matchningar mellan profiler och projekt
- Ansökningsflöde för att gå med i projekt

**5.23 Community-feeds**
- Globalt flöde av projektuppdateringar
- Kommentarer, reaktioner och delning

---

### Fas 2.5 — Sociala & Kommunikationsfunktioner

Målet är att göra samarbetet inom projekt naturligt och smidigt — utan att behöva lämna plattformen för Slack, Zoom eller e-post.

**5.24 Projektchatt (realtid)**
- Varje projekt får en inbyggd chattkanal automatiskt
- Trådar per ämne (som Slack-kanaler fast kopplade till projektet)
- @-omnämnanden som triggar notifikationer
- Fildelning direkt i chatten (bilder, dokument)
- Sökbar historik
- Teknisk implementation: WebSockets via Supabase Realtime eller Ably

**5.25 Diskussionsforum per projekt**
- Strukturerade diskussioner separerade från snabbchatten
- Inlägg med rubrik, brödtext och kategorier (t.ex. "Beslut", "Fråga", "Uppdatering")
- Röstning på inlägg — lyfter viktigaste diskussionerna
- Koppling till uppgifter och milstolpar ("Detta beslut påverkar uppgift #12")
- Inlägg kan markeras som "Löst" eller "Beslutad"
- Öppet forum (synligt för alla) eller privat (bara projektmedlemmar)

**5.26 Videomöten**
- Starta möten direkt från projektsidan — inga externa länkar behövs
- Schemalägg möten kopplade till projektets kalender
- Mötesanteckningar sparas automatiskt på projektsidan
- AI-genererad mötessammanfattning efter avslutat möte
- Teknisk implementation: integrering med Daily.co, Whereby Embedded eller Livekit (öppen källkod)

**5.27 Projektkalender**
- Gemensam kalender per projekt med deadlines, milstolpar och möten
- Synkronisering med Google Calendar och Outlook
- ICS-export för externa kalenderverktyg

**5.28 Notifikationssystem**
- Samlad notifikationscentral (en inbox för allt)
- Granulär kontroll — välj exakt vad du vill bli notifierad om per projekt
- E-post, push-notifikationer och in-app
- Daglig/veckovis digest-sammanfattning

**5.29 Databasutökning för sociala funktioner**

```
chat_channels
  id, project_id, name, type (main | thread), created_at

chat_messages
  id, channel_id, author_id, body, file_url, created_at, edited_at

forum_posts
  id, project_id, author_id, title, body, category, status (open | resolved | decided)
  pinned, visibility (public | members), created_at

forum_replies
  id, post_id, parent_id, author_id, body, votes, created_at

meetings
  id, project_id, title, scheduled_at, duration_minutes, room_url
  notes, ai_summary, created_by

project_calendar_events
  id, project_id, title, starts_at, ends_at, type (deadline | milestone | meeting)

notifications
  id, user_id, type, reference_id, reference_type, read, created_at
```

**5.30 Privata meddelanden (DM)**
- En-till-en och gruppchattar mellan valfria användare — oberoende av projekt
- Starta en konversation direkt från en användares profil
- Gruppkonversationer med upp till 20 deltagare
- Fildelning och bildbilagor
- Läskvitton (valfritt att visa)
- Meddelanden krypteras i vila och i transit (databas + TLS) — full end-to-end-kryptering nedgraderad från krav till möjlig framtida förbättring i v2.6, se punkt 10
- Notifikation vid nytt meddelande (in-app, e-post, push)
- Blockera / rapportera användare direkt från konversationen

**Databasutökning för privata meddelanden**
```
direct_conversations
  id, type (dm | group), created_at

direct_conversation_members
  id, conversation_id, user_id, joined_at, last_read_at

direct_messages
  id, conversation_id, sender_id, body, file_url, created_at, edited_at
```

---

**5.31 Teknisk stack — tillägg**

| Feature | Rekommenderat verktyg |
|---|---|
| Realtidschatt & DM | Supabase Realtime eller Ably |
| Videomöten | Daily.co, Whereby Embedded eller Livekit |
| Push-notifikationer | OneSignal eller Expo Notifications |
| AI-mötessammanfattning | Anthropic Claude API |
| Kryptering i vila/transit (DM) | Databaskryptering + TLS — full E2E ej längre krav, se 5.30 och punkt 10 |

---

### Fas 2.8 — Tribe Tokens & GoodTribes Token (dubbla nivåer)

Målet är att synliggöra och belöna varje persons insats med en belöningsstruktur i två nivåer: lokala **Tribe Tokens** per projekt, och en övergripande **GoodTribes Token (GT)** för hela plattformen. Tokens representerar bidrag och inflytande — aldrig ägarandel — och kan förtjänas genom verifierat arbete, aldrig köpas.

**Grundprincip**
> Uppgifter värderas efter prioritet, inte nedlagd tid: Låg = 10, Normal = 20, Hög = 30, Bråttom = 40 tokens.

**Juridiska gränsdragningar (gäller genomgående — se även 4c)**
- Tribe Tokens och GT är personliga och kan aldrig överlåtas, säljas eller pantsättas.
- Ingen växling mellan Tribe Tokens och GT, eller mellan olika projekts Tribe Tokens, är möjlig — det finns ingen intern växelkurs.
- Ingen token kan lösas in mot kronor. Verkliga pengaflöden (utdelning, donationer, ersättningar) sker alltid separat via Stripe Connect, aldrig som en tokentransaktion.

---

**5.32 Prioritet och tokenvärde**
- Initiativtagaren eller admin sätter uppgiftens prioritet vid skapande i Kanban: Låg (10p) / Normal (20p) / Hög (30p) / Bråttom (40p)
- Prioriteten kan ändras fritt medan uppgiften ligger i Backlog
- Prioriteten låses automatiskt när uppgiften flyttas till "Pågående" — därefter påverkar ändringar aldrig tokenvärdet retroaktivt
- Alla prioritetsändringar loggas (vem, när, från/till-värde) för transparens och för att förhindra att beslutsmakt eller belöning manipuleras i efterhand
- Uppgifter ska hållas små — en uppgift som känns större än "Hög" bör delas upp i flera kort
- *(Öppen fråga — se punkt 10: bör individuellt röstinflytande ha ett tak, t.ex. `sqrt(tokens)` eller ett procenttak, för att undvika att en enskild stor bidragsgivare dominerar ett litet projekt?)*

**5.33 Godkännande & tokenutdelning**
- Tokens tilldelas bara när uppgiften godkänts av en annan medlem än den som utfört arbetet (ingen självgodkännande)
- Godkännande flyttar kortet från "Granskning" till "Klart" och triggar automatisk mintning av Tribe Tokens till projektets lokala saldo
- Dubbelkreditering förhindras — mintning sker en gång per uppgifts-id, oavsett om kortet flyttas fram och tillbaka mellan "Granskning" och "Klart"
- Samtidigt mintas automatiskt en mindre andel (standard 10%, konfigurerbar) av samma belopp som GT till samma användare — en "spegling" som belönar helhetsbidrag till ekosystemet, utan att GT någonsin representerar ett ekonomiskt värde i sig

**5.34 Token-plånbok per användare**
- Varje användare har en plånbok som visar Tribe Tokens per projekt **och** sitt GT-saldo, tydligt separerade — aldrig som en sammanslagen totalsumma, för att inte antyda att de är utbytbara
- Pågående / ej godkända tokens visas separat från intjänade
- Tokens är transparenta — andra kan se en användares totala bidragshistorik
- Token-historiken är oföränderlig (append-only logg)

**5.35 Token-plånbok per projekt**
- Projektsidan visar Tribe Token-fördelning bland alla bidragsgivare
- Visualiserat som stapeldiagram eller cirkeldiagram
- Bidragsgivare rankas efter intjänade tokens
- Synlig för alla (öppen transparens)

**5.36 Vad tokens ger (nuvarande och framtida fas)**
- Tribe Tokens ger rösträtt inom det egna projektet (1 token = 1 röst, se Fas 2.95)
- GT ger rösträtt på plattformsnivå: prioritering av produktutveckling, policyfrågor, och fördelning av Impact-fondens medel (se Fas 2.96)
- I kommersiella projekt ger Tribe Tokens underlag för en andel av vinstutdelningen (efter styrelsens föreslagna andel till drift och Impact-fond) — som innehavaren själv väljer att rikta till valfritt projekt på plattformen, se 4a. Tokens representerar aldrig aktier eller ägande i sig (se 4c)
- Plattformsstatus: "Core Contributor", "Top Builder" etc. baserat på GT
- Prioriterad matchmaking — högt GT-saldo ger mer synlighet
- Vid crowdfunding: token-innehavare kan erbjudas förtur eller rabatt

**5.37 Databasutökning för Tribe Tokens & GT**

```
(priority och priority_locked_at definieras redan på tasks-tabellen, se Fas 1 — Databasutökning för unified tasks)

priority_change_log
  id, task_id, changed_by, old_priority, new_priority, changed_at

token_ledger (append-only, aldrig uppdateras — Tribe Tokens)
  id, user_id, project_id, task_id, tokens, reason, created_at

token_balances (materialiserad vy / cache — Tribe Tokens per projekt)
  user_id, project_id, total_tokens, last_updated

platform_token_ledger (append-only — GT)
  id, user_id, source_project_id, source_task_id, gt_tokens, reason, created_at

platform_token_balances (materialiserad vy / cache — GT)
  user_id, total_gt, last_updated
```

---

### Fas 2.9 — AI-agenter som projektmedlemmar

Målet är att låta användare delegera textbaserade och research-baserade uppgifter direkt till en AI-agent från Kanban-boardet — med en människa som granskar och godkänner leveransen innan uppgiften stängs.

**Grundprincip**
> AI är en projektmedlem, inte ett verktyg. Den tilldelas uppgifter, levererar ett resultat och väntar på godkännande — precis som en mänsklig bidragsgivare.

AI-agenten tjänar **inga Tribe Tokens** — tokens tilldelas den människa som granskar och godkänner leveransen, som ersättning för granskningstid.

---

**5.38 AI-tilldelning av uppgifter**
- På varje Kanban-kort finns knappen "Tilldela AI"
- Användaren bekräftar uppgiftstypen (text / research) och lägger till eventuell extra kontext
- Kortet får statusen "AI arbetar..." och en spinner
- Tillgängliga agenttyper vid lansering:
  - **Skribent** — skriver utkast, sammanfattningar, rapporter, mejl
  - **Analytiker** — analyserar data, dokument eller beskrivningar
  - **Researcher** — söker information på webben och sammanställer en strukturerad rapport

**5.39 Agentens arbetsflöde**

```
1. Uppgift tilldelas AI
2. Agent läser titel, beskrivning och projektkontext
3. Vid research: webssökning via Claude web search tool
4. Agent producerar ett strukturerat resultat (markdown)
5. Resultat sparas som ett "AI-utkast" på uppgiftskortet
6. Kortet flyttas till kolumnen "Granskning"
7. Granskare öppnar kortet, läser leveransen
8. Granskare godkänner (→ Klart + tokens) eller avvisar (→ AI försöker igen med feedback)
```

**5.40 Granskning & feedback-loop**
- Granskaren ser AI-leveransen sida vid sida med uppgiftsbeskrivningen
- Tre val: Godkänn / Begär revidering / Avvisa
- Vid revidering skriver granskaren feedback — AI försöker igen med feedbacken som kontext
- Max 3 revideringsförsök — därefter eskaleras uppgiften till manuell hantering
- Godkänd leverans låses och sparas permanent på uppgiftskortet

**5.41 Tokens vid AI-utfört arbete**
- AI tjänar inga tokens
- **GoodTribes tilldelas Tribe Tokens** (projektlokala, inte GT) motsvarande uppgiftens fulla prioritetsvärde — som ersättning för att plattformen tillhandahåller AI-kapaciteten. Detta ger GoodTribes rösträtt inom just det projektet, i linje med Fas 2.95
- Granskaren tilldelas Tribe Tokens baserat på granskningsinsats (standard: 20% av uppgiftens prioritetsvärde), utöver GoodTribes andel — samt motsvarande GT-spegling enligt 5.33
- Om uppgiften kräver flera revideringar ökar granskarens token-ersättning proportionellt
- GoodTribes token-saldo per projekt är offentligt synligt — full transparens om plattformens andel

**5.42 Projektkontext för agenten**
- Agenten får automatiskt tillgång till:
  - Projektets titel, beskrivning och mål
  - Alla godkända leveranser från tidigare uppgifter (kontext-minne)
  - Uppgiftens titel, beskrivning och kategori
- Känsliga fält (t.ex. chattmeddelanden, privata kommentarer) delas aldrig med agenten

**5.43 Teknisk implementation**

```javascript
// Exempelanrop till Claude API för Skribent-agenten
{
  model: "claude-sonnet-4-6",
  system: `Du är en professionell skribent och projektmedlem i projektet "${project.title}".
           Projektbeskrivning: ${project.description}
           Tidigare leveranser i projektet: ${context}
           Leverera alltid i markdown-format.`,
  messages: [
    { role: "user", content: `Utför följande uppgift:\n\n**${task.title}**\n\n${task.description}` }
  ],
  tools: [] // Research-agenten får även web_search-verktyget
}
```

**5.44 Databasutökning för AI-agenter**

```
ai_task_runs
  id, task_id, agent_type (writer | analyst | researcher)
  status (running | awaiting_review | approved | rejected | escalated)
  output_markdown, attempt_number, created_at, completed_at

ai_task_reviews
  id, ai_task_run_id, reviewer_id, decision (approved | revision | rejected)
  feedback, tokens_awarded, created_at
```

---

### Fas 2.95 — Token-viktad röstning (Projektdemokrati)

Målet är att ge projektmedlemmar reellt inflytande över projektbeslut — proportionellt mot deras faktiska bidrag. Den som arbetat mest har störst röststyrka.

**Grundprincip**
> Antal tillgängliga röster = antal Tribe Tokens intjänade i projektet

Detta gäller projektnivån specifikt. GT ger separat rösträtt på plattformsnivå (se Fas 2.96) — de två röstsystemen är alltid åtskilda, precis som tokennivåerna de bygger på (se Fas 2.8).

GoodTribes röster (från AI-utförda uppgifter, i form av Tribe Tokens) räknas med i omröstningar — plattformen är en transparent röstberättigad aktör i alla projekt.

---

**5.45 Skapa en omröstning**
- Initiativtagaren och medarbetare kan skapa omröstningar
- Frågetyper:
  - **Ja / Nej** — enkel binär fråga
  - **Flerval** — välj ett alternativ bland flera
  - **Rangordning** — prioritera alternativ i ordning
  - **Öppen budget** — fördela ett antal tokens/poäng mellan alternativ
- Valfri deadline för omröstningen
- Omröstningen kan vara öppen (alla ser resultatet live) eller dold (resultatet visas först efter deadline)
- Bifoga dokument, länkar eller diskussionstråd som beslutsunderlag

**5.46 Röstningsmekanik**
- Varje token = en röst
- Användaren väljer hur många av sina tillgängliga röster de vill lägga på varje alternativ
- Tokens förbrukas inte vid röstning — de används bara som viktning
- Röster kan ändras tills omröstningen stänger
- Minsta röstkvorum kan sättas (t.ex. "minst 30% av totala tokens måste ha röstat")

**5.47 Resultat & transparens**
- Resultatet visas som viktad sammanräkning
- Varje röst är spårbar — vem röstade vad är synligt för projektmedlemmar
- Historik över alla genomförda omröstningar sparas permanent på projektsidan
- Beslut kan markeras som "Bindande" eller "Rådgivande"
- Bindande beslut kopplas till en milstolpe eller uppgift automatiskt
- Vissa omröstningar initieras av GoodTribes styrelse snarare än initiativtagaren (t.ex. fördelning av vinstutdelning, se Fas 2.96) — dessa är bindande men med vetorätt för styrelsen om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet

**5.48 Specialfall — GoodTribes röststyrka**
- GoodTribes token-saldo visas öppet i varje omröstning
- Initiativtagaren kan välja att exkludera GoodTribes röster från specifika omröstningar
- GoodTribes röstar aldrig automatiskt — en manuell process krävs för att GoodTribes ska delta

**5.49 Databasutökning för röstning**

```
polls
  id, project_id, created_by, title, description, type (yes_no | multiple | ranked | budget)
  status (open | closed), visibility (live | hidden), quorum_percent
  is_binding, initiated_by (member | goodtribes_board), deadline, created_at, closed_at
  board_veto_used (bool, default false), board_veto_reason, board_veto_at

poll_options
  id, poll_id, label, description, sort_order

poll_votes
  id, poll_id, poll_option_id, user_id, token_weight, created_at, updated_at

poll_results (materialiserad vy)
  poll_id, poll_option_id, total_token_weight, voter_count, winner (bool)
```

---

### Fas 2.96 — Impact-fond & kapitalomfördelning

Målet är att kanalisera kapital från vinstdrivande projekt till Stiftelsens drift och till nya projekt som behöver hjälp att komma igång — ett av GoodTribes centrala syften — utan att detta sker via tokenväxling (se juridisk gränsdragning i Fas 2.8 och 4c). Flödet sker i vanlig valuta, styrt av tydliga, loggade beslutssteg.

Impact-fonden är specifikt inriktad på **uppstartskapital** — att hjälpa nya (företrädesvis ideella) projekt över den första tröskeln, snarare än att vara ett generellt löpande stöd till redan etablerade projekt.

**Grundprincip**
> Tokens styr *vem som bestämmer*. Pengar rör sig alltid som vanliga kronor via Stripe Connect — aldrig som en tokentransaktion.

---

**5.50 Kapitalflödet**
1. Ett kommersiellt AB (helägt av Stiftelsen, se 4c) genererar vinst och lämnar utdelning till Stiftelsen enligt gällande aktiebolagsrättsliga regler.
2. GoodTribes styrelse lägger fram ett förslag om hur stor andel av utdelningen som ska gå till **Stiftelsens dagliga drift** respektive **Impact-fonden**. Projektets Tribe Token-innehavare röstar om förslaget, proportionellt mot sitt tokeninnehav. Detta är ett delegerat beslutsmandat enligt avtalet i 4c — men styrelsen har vetorätt om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet.
3. Den andel som röstas till Impact-fonden tillförs fonden. Resterande del (efter drift och Impact-fond) fördelas till varje bidragsgivare proportionellt mot deras Tribe Token-innehav, och var och en väljer sedan själv vilket eller vilka GoodTribes-projekt de vill rikta sin del till (se 4a, Steg 2).
4. Stiftelsen fördelar Impact-fondens samlade medel som uppstartskapital till nya projekt — antingen genom en ansökningsprocess (se Fas 3.5, Extern Fondansökan) eller genom en separat plattformsomfattande GT-röstning om vilka projekt som ska prioriteras en given period.
5. Varje överföring — oavsett om den går via Impact-fonden eller direkt från en bidragsgivares individuella val — registreras som en verklig Stripe-transaktion, kopplad till en post i respektive projekts ledger. Aldrig som en tokenöverföring.

**5.51 Transparens**
- Impact-fondens inflöden och utflöden är offentligt synliga (belopp, källprojekt, mottagarprojekt, datum) — i linje med kärnvärdet Öppenhet.
- Kvartalsvis sammanställning ingår i den befintliga transparensrapporten (se 4a).

**5.52 Databasutökning för Impact-fonden**

```
impact_fund_ledger
  id, project_id, direction (in | out), amount_sek
  related_stripe_transfer_id, decided_by_poll_id (nullable), created_at
```

---

### Fas 2.97 — Granskningsråd, uteslutning & etisk granskning

Målet är att ge communityn en oberoende, demokratiskt vald instans för att hantera allvarliga fall av regelbrott eller misskötsel — utan att förlita sig på ensidiga beslut från Stiftelsen eller ett enskilt projekts initiativtagare. Rådet är plattformens enda granskningsorgan: det hanterar både uteslutning av användare och etisk granskning av flaggade projekt (se Fas 5, 5.76 för det senare).

**Grundprincip**
> Communityn röstar fram ett Granskningsråd genom GT (plattformsnivå). Rådet utreder och beslutar om uteslutning av användare — från hela GoodTribes eller från ett specifikt underprojekt — samt om huruvida flaggade projekt bryter mot GoodTribes etiska riktlinjer.

---

**5.53 Granskningsrådet**
- Rådet väljs av communityn genom en GT-viktad omröstning (se Fas 2.95/2.96 för röstningsmekanik), för en bestämd mandatperiod
- Rådet utreder anmälningar om grov misskötsel, regelbrott eller uppförande som skadar GoodTribes eller enskilda projekt — samt projekt som flaggats som potentiellt oetiska eller skadliga (se Fas 5, 5.76)
- Rådet kan besluta om: uteslutning från ett specifikt projekt, uteslutning från hela plattformen, mildare åtgärder (varning, tillfällig avstängning), eller — för flaggade projekt — godkännande, varning eller nedstängning
- Beslut kräver majoritet inom rådet och ska motiveras skriftligt
- Den anmälda personen eller projektets initiativtagare har rätt att bemöta anmälan innan beslut fattas
- *(Öppna frågor — se punkt 10: antal ledamöter, mandatperiodens längd, och exakt valprocess är inte specificerade.)*

**5.54 Förhållande till andra beslutsinstanser**
- Rådets mandat gäller uppförande, regelbrott och etisk lämplighet — inte affärsbeslut. Stiftelsens vetorätt i kommersiella projekt (se 4c) gäller specifikt juridisk eller finansiell risk för Stiftelsen, en separat fråga
- Initiativtagaren kan uteslutas av Granskningsrådet vid grov misskötsel, trots att rollhierarkin (5.5) annars anger att initiativtagaren inte kan tas bort av andra medlemmar i projektet
- Rådets beslut är bindande men kan i undantagsfall överklagas till Stiftelsens styrelse, t.ex. om beslutet bedöms strida mot grundläggande rättssäkerhet

**5.55 Databasutökning**

```
review_council_members
  id, user_id, term_start, term_end, elected_via_poll_id

exclusion_cases
  id, reported_user_id, reported_by, project_id (nullable — null = plattformsomfattande)
  reason, status (open | under_review | resolved)
  decision (none | warning | project_ban | platform_ban)
  decided_at, decision_reasoning, created_at

exclusion_case_votes
  id, case_id, council_member_id, vote (approve | reject), reasoning, created_at

project_flags
  id, project_id, flagged_by, reason, status (pending | under_review | resolved)
  created_at

ethics_reviews
  id, project_flag_id, council_member_id, outcome (approved | warning | removed)
  reasoning, decided_at, created_at
```

---

### Fas 3 — Crowdfunding & Finansiering

Målet är att koppla ekonomiska resurser till verifierade projekt.

**5.56 Finansieringskampanjer**
- Mål, deadline och progress bar
- Belöningsnivåer (Kickstarter-modell) eller donationsbaserad
- **Token-baserad finansiering** — finansiärer får Tribe Tokens i projektet, proportionellt mot sitt bidrag, enligt en växelkurs som initiativtagaren sätter vid kampanjskapande (t.ex. "100 kr = 1 Tribe Token"). Detta ger samma rösträtt (se Fas 2.95) och, om projektet är kommersiellt, samma rätt till andel av vinstfördelningen (se 4a, Steg 2) som bidragsgivare som tjänat tokens genom arbete. Inga aktier säljs — Stiftelsens ägande av eventuellt AB (se 4c) påverkas aldrig, och Finansinspektionens equity-crowdfunding-tillstånd krävs inte.

**5.57 Betalningar**
- Stripe Connect för globala betalningar
- Stöd för kort, banköverföring och lokala betalmetoder
- Automatisk utbetalning vid uppnått mål

**5.58 Transparens & rapportering**
- Finansiärerna ser hur medlen används
- Koppling mellan utgifter och projektmilstolpar
- Exporterbar rapport för redovisning

---

### Fas 3.5 — Extern Fondansökan ⚠️ Framtida fas

> **Status: Ej prioriterad — planeras efter övriga faser är lanserade.**

Målet är att låta initiativtagare söka finansiering från externa fonder, stiftelser och bidragsgivare direkt från plattformen — utan att behöva lämna GoodTribes eller anlita en konsult.

---

**5.59 Fondkatalog**

En sökbar databas över fonder och stiftelser som delar ut medel till projekt inom GoodTribes kategorier.

- Fonder indexeras och uppdateras löpande via AI-webbsökning och manuell redaktion
- Filtrerbar per: kategori, geografi, bidragsstorlek, deadline, typ (offentlig / privat / EU)
- Varje fond visas med: syfte, kriterier, maxbelopp, ansökningsdeadline och historiska beviljade projekt
- AI matchar automatiskt projekt mot relevanta fonder baserat på projektets beskrivning, kategori och impact-mått
- Notifikation när en matchande fond öppnar för ansökningar

**5.60 AI-assisterad ansökningsskrivning**

Att skriva fondansökningar är tidskrävande och kräver specifik kompetens. AI tar bort den barriären.

- Initiativtagaren väljer en fond och klickar "Ansök med AI-hjälp"
- AI läser fondens kriterier och projektets befintliga data (beskrivning, milstolpar, impact-mått, budget, teammedlemmar)
- AI genererar ett komplett ansökningsutkast anpassat till fondens specifika krav och språk
- Utkastet redigeras av initiativtagaren i en inbyggd editor
- Versionskontroll — alla versioner av ansökan sparas
- Mentorer med fondansökningserfarenhet kan bjudas in för att granska

**5.61 Ansökningshantering**

- Dashboard per projekt med alla pågående och avslutade ansökningar
- Status per ansökan: Utkast / Inskickad / Under granskning / Beviljad / Avslagen
- Påminnelser inför ansökningsdeadlines
- Vid beviljat bidrag: automatisk länkning till projektets budget och crowdfunding-modul
- Statistik: beviljandegrad per fondtyp och kategori — delas anonymt med hela plattformen som lärdomar

**5.62 Databasutökning — fondansökan**

```
funds
  id, name, description, url, category[], geography[], min_amount, max_amount
  deadline, type (public | private | eu), active, last_updated

fund_applications
  id, project_id, fund_id, status (draft | submitted | reviewing | granted | rejected)
  application_text, submitted_at, decision_at, amount_granted, created_at

fund_application_versions
  id, fund_application_id, body_markdown, created_by, created_at
```

---

### Fas 4 — Skalning & Global Etablering

Målet är att hjälpa framgångsrika projekt växa bortom sin ursprungliga kontext — till nya geografier, nya målgrupper och global impact. Det är här GoodTribes vision fulländas: från lokal idé till global förändring.

---

**5.63 Projektmognadsbedömning**

AI utvärderar löpande ett projekts mognad baserat på aktivitet, tokens, finansiering och community-engagemang och föreslår när det är dags att skala.

- **Mognadspoäng** (0–100) visas på projektsidan
- Baseras på: antal aktiva bidragsgivare, token-aktivitet, avklarade milstolpar, crowdfunding-resultat, community-engagemang
- När poängen når ett tröskelvärde (standard: 70) visas en prompt: *"Ditt projekt är redo att skalas — vill du expandera?"*
- Initiativtagaren kan när som helst starta skalningsprocessen manuellt

**5.64 AI-driven skalningsplan**

När initiativtagaren initierar skalning genererar AI en skräddarsydd skalningsplan:

- **Geografisk expansion** — AI identifierar 3–5 regioner där problemet är relevant och liknande initiativ saknas
- **Replikeringsguide** — steg-för-steg-guide för hur en ny lokal instans av projektet startas
- **Resursanalys** — vad behövs i personal, teknik och finansiering för att skala
- **Riskbedömning** — kulturella, juridiska och operativa risker per målregion
- **Partnerförslag** — AI söker efter organisationer och projekt på GoodTribes som kan vara naturliga partners

**5.65 Projekt-franchising**

Ett projekt kan officiellt öppna sig för replikering — andra användare kan "forka" projektet till en ny geografi.

- Initiativtagaren aktiverar "Öppen för replikering" på projektsidan
- Intresserade användare ansöker om att starta en lokal instans
- Godkänd instans får: projektets wiki, milstolpar och uppgiftsmallar som startpunkt
- Alla instanser kopplas till ett globalt nätverk under ursprungsprojektet — oavsett om ursprungsprojektet är kommersiellt eller ideellt (se 4c), varje instans har sin egen juridiska form
- Ursprungsprojektet kan sätta riktlinjer som alla instanser måste följa
- Instansernas framsteg och tokens är synliga i ett globalt dashboard

**5.66 Globalt nätverksdashboard**

En samlad vy för projekt med flera geografiska instanser:

- Världskarta med alla aktiva instanser markerade
- Aggregerad statistik: totalt antal bidragsgivare, tokens, avklarade uppgifter, insamlade medel
- Jämförelse mellan instanser — vilka presterar bäst och varför?
- Delning av lärdomar och bästa praxis mellan instanser via ett gemensamt forum
- AI-genererade insikter: *"Instansen i Kenya har 3x högre engagemang — här är vad de gör annorlunda"*

**5.67 Impact-mätning**

GoodTribes mäter och visualiserar projektens verkliga samhällsnytta — inte bara aktivitet.

- Initiativtagaren definierar 1–3 impact-mått vid projektstart (t.ex. "antal personer som fått tillgång till rent vatten", "ton plast återvunnet", "unga som fått jobb")
- Mätvärden uppdateras manuellt eller via integrationer (t.ex. Google Sheets, externa databaser)
- Impact visas publikt på projektsidan och i discovery
- Aggregerad global impact visas på GoodTribes startsida: *"Tillsammans har GoodTribes-projekt påverkat X miljoner människor"*
- AI analyserar sambanden mellan projektaktivitet och impact: *"Projekt med fler än 5 aktiva bidragsgivare uppnår impact-mål 2x snabbare"*

**5.68 Partnerskap & organisations-API**

För att underlätta samarbete med externa organisationer (NGO:er, FN-organ, företag med CSR-mål):

- Organisationer kan skapa ett verifierat konto och koppla resurser till projekt
- API för att integrera GoodTribes-projekt i externa rapporterings- och uppföljningssystem
- Organisationer kan sponsra specifika projekt eller impact-kategorier
- Matchmaking mellan projekt och potentiella organisationspartners baserat på impact-kategori och geografi

**5.69 Alumni-nätverk**

När ett projekt avslutas eller uppnår sina mål:

- Projektet arkiveras med full historik synlig för alla
- Bidragsgivare får ett "Alumni"-märke på sin profil
- Projektet publiceras i en "Hall of Impact" — en publik katalog över avslutade framgångsrika projekt
- AI genererar en automatisk slutrapport: tidslinje, bidragsgivare, impact, lärdomar
- Slutrapporten kan användas som referens för framtida liknande projekt

**5.70 Databasutökning — skalning**

```
project_maturity
  id, project_id, score, calculated_at, scale_initiated_at

project_instances
  id, parent_project_id, child_project_id, region, status (pending | active | paused)
  approved_by, created_at

impact_metrics
  id, project_id, label, unit, target_value, current_value, updated_at

impact_updates
  id, impact_metric_id, value, note, updated_by, created_at

partnerships
  id, project_id, organization_id, type (sponsor | partner | supporter)
  description, created_at

project_alumni
  id, project_id, user_id, tokens_earned, badge_issued_at
```

---

### Fas 5 — Mänsklig Grund

Målet är att säkerställa att plattformen är tillgänglig, trygg och motiverande för alla människor — oavsett bakgrund, språk, teknisk vana eller internetuppkoppling. Det är det som avgör om GoodTribes verkligen kan förändra världen.

---

**5.71 Onboarding & vägledning**

En ny användare ska aldrig behöva undra vad de ska göra härnäst. Plattformen möter dem där de är och guidar dem steg för steg.

- **Välkomstflöde** vid första inloggning — 3 enkla frågor: *Vad brinner du för? Vad kan du bidra med? Vill du starta ett projekt eller gå med i ett?*
- Baserat på svaren genererar AI en personlig startplan: rekommenderade projekt att följa, idéer att utforska, kompetenser att fylla i
- **Interaktiv guide** för nya initiativtagare — "Ditt projekt är skapat. Här är dina tre första steg"
- Kontextuell hjälp på varje sida — en diskret "?" som förklarar funktionen utan att lämna sidan
- **Framstegsindikatorer** — visar hur långt användaren kommit i att sätta upp sin profil och sitt första projekt
- AI-coach: efter 7 dagars inaktivitet skickas ett personligt meddelande — *"Hej! Du satte upp ett projekt om X. Vill du att jag hjälper dig ta nästa steg?"*

**5.72 Mentorskap**

Erfarna projektledare och domänexperter kan erbjuda sin tid och kunskap till nya projekt.

- Användare kan ansöka om att bli **certifierad mentor** inom en eller flera kategorier (t.ex. Miljö, Teknik, Fundraising, Ledarskap)
- Mentorer verifieras manuellt av GoodTribes-teamet baserat på erfarenhet och track record på plattformen
- Projekt kan efterlysa en mentor — AI matchar baserat på projektets kategori och mentorns kompetens
- Mentorssessioner bokas direkt via plattformens kalenderfunktion och hålls i videomöten
- Mentorer tjänar **Tribe Tokens** för sin tid — samma system som för övriga bidrag
- Mentorer visas med en särskild badge på sin profil och rankas efter feedback från mentorerade projekt
- **Grupmentorskap** — en mentor kan hålla öppna sessioner för flera projekt samtidigt

```
mentors
  id, user_id, categories[], bio, verified, created_at

mentorship_requests
  id, project_id, mentor_id, status (pending | accepted | declined)
  message, session_at, tokens_awarded, created_at

mentorship_feedback
  id, mentorship_request_id, rating, comment, created_at
```

**5.73 Lärande & kompetensutveckling**

Plattformen sänker tröskeln för personer som har drömmar men saknar konkreta färdigheter.

- **GoodTribes Academy** — en inbyggd kunskapsbank med guider och resurser inom:
  - Projektledning för nybörjare
  - Hur man startar en crowdfunding-kampanj
  - Kommunikation och community-byggande
  - Tekniska grundkurser (bygga en sajt, använda AI-verktyg)
  - Impact-mätning och rapportering
- Innehållet är kort och praktiskt — max 10 minuters läsning per guide
- AI rekommenderar relevanta guider baserat på var i projektet användaren befinner sig
- Användare kan bidra med egna guider — granskas av mentorer innan publicering
- Avklarade guider ger ett lärande-märke på profilen

```
academy_guides
  id, title, body_markdown, category, author_id, reviewed_by
  difficulty (beginner | intermediate | advanced), read_time_minutes
  published, created_at

user_guide_completions
  id, user_id, guide_id, completed_at
```

**5.74 Välmående & motivation**

Projekt tar tid och folk tappar energi. Plattformen arbetar aktivt för att hålla motivationen uppe.

- **Milstolpefirande** — när en milstolpe markeras som klar visas en animation och ett automatiskt inlägg i projektflödet: *"🎉 [Projektnamn] nådde milstolpen: [X]!"*
- **Veckouppsummering** — varje fredag skickas ett personligt mejl med vad användaren åstadkommit den gångna veckan, intjänade tokens och ett uppmuntrande meddelande från AI
- **Community-hyllningar** — medlemmar kan skicka en "kudos" till en medarbetare för ett bra bidrag. Kudos visas på profilen och i aktivitetsflödet
- **Streak-system** — synlig räknare för hur många veckor i rad användaren bidragit till ett projekt
- **Projektpuls** — en synlig hälsomätare per projekt baserad på aktivitet. Om pulsen sjunker notifieras initiativtagaren och AI föreslår konkreta åtgärder
- **Drömväggen** — en publik sida där användare kan posta sin vision i en mening. Andra kan reagera och koppla relevanta projekt till drömmen

```
kudos
  id, from_user_id, to_user_id, project_id, message, created_at

user_streaks
  id, user_id, project_id, current_weeks, longest_weeks, last_activity_at

dream_wall_posts
  id, user_id, dream_text, created_at

dream_wall_reactions
  id, dream_wall_post_id, user_id, emoji, created_at
```

**5.75 Tillgänglighet & flerspråksstöd**

Visionen är global — plattformen måste vara det också.

- **Flerspråkigt gränssnitt** — UI översatt till minst: Svenska, Engelska, Spanska, Franska, Arabiska, Swahili, Hindi, Portugisiska vid lansering
- **AI-översättning av innehåll** — projektbeskrivningar, blogginlägg och wiki-sidor kan automatöversättas med ett klick
- **Lågbandbreddsläge** — en förenklad version av plattformen utan bilder och tunga element, optimerad för långsamma uppkopplingar
- **Skärmläsarkompatibilitet** — WCAG 2.1 AA-standard för tillgänglighet
- **Mobilfirst** — alla funktioner fullt tillgängliga på mobil, inte bara desktop
- **Offline-stöd (PWA)** — kärnfunktioner (läsa wiki, se uppgifter, skriva i editor) fungerar utan internetuppkoppling och synkroniseras när uppkopplingen återkommer
- Valutavisning anpassas automatiskt efter användarens region

**5.76 Etisk granskning**

GoodTribes är en plattform för positiv förändring — det kräver ett ramverk för att säkerställa att projekt faktiskt bidrar till det.

- **Etiska riktlinjer** — tydligt publicerade principer för vilka projekt som är välkomna (och inte). Baserade på FN:s globala mål (SDG)
- **Community-flaggning** — vem som helst kan flagga ett projekt som potentiellt skadligt med en motivering
- **Granskningsrådet** granskar flaggade projekt — samma community-valda organ som hanterar uteslutning av användare (se Fas 2.97), snarare än en separat kommitté
- **AI-förhandsgranskning** — när ett projekt skapas analyserar AI beskrivningen och varnar om innehållet bryter mot riktlinjerna
- **Transparensrapport** — GoodTribes publicerar kvartalsvis en rapport om flaggade projekt, beslut och åtgärder
- **Överklagandeprocess** — initiativtagare kan överklaga ett beslut om nedstängning till Stiftelsens styrelse (se Fas 2.97, 5.54)

*(Databasschema för flaggning och etisk granskning finns i Fas 2.97, 5.55 — samma tabeller används för båda typerna av granskning.)*

---

## 6. Teknisk stack (rekommenderad)

| Lager | Verktyg |
|---|---|
| Frontend | Next.js + Tailwind CSS |
| Backend / API | Next.js API routes eller separat Node/Express |
| Databas | Supabase (PostgreSQL + Auth + Storage) |
| Betalningar | Stripe Connect |
| Deployment | Vercel |
| AI-features | Anthropic Claude API (idégenerering, SDG-förslag, matchmaking, AI-agenter) |
| E-post | Resend eller SendGrid |

---

## 7. Databasschema — Kärnentiteter (översikt)

```
users
  id, name, email, avatar_url, bio, skills[], location, created_at

organizations
  id, name, description, logo_url, verified, initiator_user_id

projects
  id, title, description, status, visibility, category, initiator_user_id, org_id, created_at
  legal_type (commercial_ab | nonprofit_umbrella | nonprofit_own_assoc) — se 4c

project_members
  id, project_id, user_id, role (initiator | collaborator | follower)

tasks
  id, project_id, title, description, status, assignee_id, deadline
  priority (low | normal | high | urgent), priority_locked_at, created_at

milestones
  id, project_id, title, target_date, completed_at

campaigns
  id, project_id, goal_amount, current_amount, currency, deadline
  type (donation | reward | token), token_conversion_rate (nullable, endast för type=token)

contributions
  id, campaign_id, user_id, amount, currency, tokens_awarded, created_at
```

---

## 8. Användarscenarion (User Stories)

**Som initiativtagare vill jag...**
- Skapa ett projekt och bjuda in medarbetare
- Hantera uppgifter i ett Kanban-board
- Starta en finansieringskampanj kopplad till mitt projekt
- Se vem som är intresserad av att bidra med sin kompetens

**Som bidragsgivare vill jag...**
- Hitta projekt som matchar mina intressen och kompetenser
- Söka med i ett projekt och bli matchad automatiskt
- Finansiera projekt jag tror på
- Tjäna Tribe Tokens både för arbetsinsats och för finansiella bidrag (se Fas 3, 5.56)
- Följa progress och se hur mina pengar används
- Tjäna Tribe Tokens för varje godkänd arbetsinsats
- Se min token-historik och jämföra med andra bidragsgivare

**Som organisation vill jag...**
- Skapa en organisationssida och koppla projekt till den
- Visa upp vårt arbete transparent
- Hitta individer med rätt kompetens

---

## 9. MVP — Scope

För att komma till marknad snabbast möjligt begränsas MVP till:

**Inkluderat i MVP:**
- Autentisering via Google + magic link (Supabase Auth)
- Projektskapa och -hantering
- Kanban-board med grundläggande uppgifter
- Enkla användarprofiler
- Projektdiscovery (sök + filter)
- Offentlig projektsida
- Idéflöde med röstning och kommentarer (Fas 1.5 grundnivå)
- Tribe Tokens & GT (se Fas 2.8) — prioritetsbaserad tokenutdelning på Kanban-uppgifter *(tillagd i v2.6 — redan byggt och i drift, se punkt 10)*

**Ej inkluderat i MVP:**
- Crowdfunding och betalningar
- AI-matchmaking
- Token-baserad finansiering (crowdfunding mot Tribe Tokens)
- Avancerad rapportering
- Co-creation (versionshistorik och pull requests för idéer — Fas 1.5, prioritet höjd i v2.6, se punkt 10)

---

## 10. Öppna frågor

| Fråga | Status |
|---|---|
| Equity crowdfunding — vilka jurisdiktioner stödjs från start? | **Löst (v2.4): Inte längre relevant — finansiärer får Tribe Tokens istället för aktier, se Fas 3 (5.56).** |
| Vem sätter gränser för växelkursen kr→Tribe Tokens vid finansieringskampanjer — fritt av initiativtagaren, eller med en plattformsrekommenderad standard? | Öppen |
| Moderering av projekt och innehåll | **Delvis löst (v2.4): Uteslutning av användare och etisk granskning av flaggade projekt hanteras båda av samma community-valda Granskningsråd, se Fas 2.97 och 5.76. Löpande innehållsmoderering (spam, olämpliga kommentarer etc.) är fortfarande öppen.** |
| Freemium vs. prenumerationsmodell | Öppen |
| Hur hanteras projekt i flera språk? | Öppen |
| Vilken valuta används som standard? | Öppen |
| Kan Tribe Tokens eller GT någonsin lösas in mot pengar? (påverkar juridisk klassificering) | **Löst (v2.4): Nej, aldrig. Se Fas 2.8 och 4c** |
| Vad händer med tokens om ett projekt läggs ner? | Öppen |
| Hur hanteras missbruk — t.ex. uppblåsta prioritetssättningar? | Öppen |
| Vilken AI-kostnad bär plattformen vs. initiativtagaren för agentuppgifter? | Öppen |
| Ska AI-agentens leveranser vara synliga publikt eller bara för projektmedlemmar? | Öppen |
| Exakt procentsats för GT-spegling vid tokenmintning (standard 10% föreslaget) | Öppen |
| Tak på individuellt röstinflytande per projekt (t.ex. `sqrt(tokens)` eller procenttak)? | Öppen |
| Exakta tröskelvärden för när ett ideellt projekt får knoppas av till egen förening | Öppen |
| Vinstdelningsprocent mellan kommersiellt AB och Stiftelsen | **Löst (v2.4): Inte en fast procentsats — 100% av vinsten går till Stiftelsen som ägare, och projektets Tribe Token-innehavare röstar om hur överskottet därefter fördelas. Se 4a och Fas 2.96.** |
| Vinstfördelning: minimibelopp till drift/Impact-fond utan att röstas bort | **Löst (v2.4): Styrelsen föreslår andelen till drift och Impact-fond, medlemmarna röstar, styrelsen har vetorätt vid fara för Stiftelsens fortsatta verksamhet. Se 4a och Fas 2.96.** |
| Vad händer om en bidragsgivare inte aktivt väljer vilket projekt deras andel av vinsten ska gå till? | **Löst (v2.4): Om inget aktivt val görs inom en fastställd tidsram går andelen automatiskt till Impact-fonden.** |
| Granskningsrådet: antal ledamöter, mandatperiodens längd och exakt valprocess | Öppen |
| Hur överklagas ett beslut av Granskningsrådet till Stiftelsens styrelse i praktiken — vilken tidsram och process gäller? | Öppen |
| Struktur, villkor och prissättning för partnerskap/sponsring/fonder/utbildning (Intäktsström 3) | Öppen |
| Exakt definition och mätmetod för plattformens nyckeltal (förverkligade drömmar, nytta) | Öppen |
| Hur offentlig sektor och akademia passar in i `legal_type` — de ägs varken av eller ligger under Stiftelsen som övriga projektformer | Öppen |
| Internationell motsvarighet till "helägt svenskt AB"-modellen för kommersiella projekt utanför Sverige | Öppen |
| Efterträdarval: vad händer om ingen kandidat får majoritet, eller om initiativtagaren lämnar innan en efterträdare valts? | Öppen |
| Övergång mellan juridisk form (`legal_type`): exakt tidsram och process för hur Stiftelsen hanterar en godkänd övergångsbegäran | Öppen |
| Bedrägeriskydd för crowdfunding och tokenmintning (falska projekt, manipulerad prioritetssättning i stor skala) | Öppen |
| Tvistlösningsprocess mellan medlemmar/projekt för vanliga affärstvister — utöver Granskningsrådets mandat för misskötsel och etik | Öppen |
| Säkerhetsrutiner: incidenthantering, säkerhetsgranskningar och process vid dataintrång | Öppen |
| SSO/SAML-inloggning för organisationer (offentlig sektor, akademia, företag) | Öppen |
| Upphandlingsvänliga funktioner för institutioner: fakturering, DPA (databehandlingsavtal), SLA | Öppen |
| Betalningstäckning utanför Stripe Connects starka marknader (t.ex. Afrika, Sydasien) — risk att utestänga målgrupper i linje med GoodTribes vision | Öppen |
| Internationell motsvarighet till den svenska stiftelse-/AB-strukturen (se även tidigare fråga om "helägt AB") för verklig global skalning | Öppen |
| Arbetsrättslig och skattemässig status för tokenintjäning som blir till pengar — anställd, uppdragstagare eller volontär i olika jurisdiktioner? | Öppen |
| Strategi för att lösa cold start-problemet — hur nås de första ~100 aktiva projekten och ~1000 medlemmarna innan nätverkseffekten bär plattformen själv? | Öppen |
| Google-inloggning är prioriterad som MVP i 4b, men bara magic link (Resend) är implementerat i nuvarande kod — ska Google-inloggning prioriteras innan lansering? | **Väntar (v2.6): Nedprioriterat för nu — hanteras senare, inte blockerande för övrigt arbete.** |
| §9 anger att Kanban i MVP ska vara utan tokenutdelning, men Tribe Tokens/GT (Fas 2.8) är redan fullt implementerat i koden — bör §9:s MVP-scope uppdateras för att spegla detta, eller bör tokenutdelningen stängas av tills övriga MVP-delar är klara? | **Löst (v2.6): §9 uppdaterat — Tribe Tokens & GT flyttat till "Inkluderat i MVP" för att spegla att det redan är byggt och i drift.** |
| Idéverkstaden (Fas 1.2 — kollaborativ trådbaserad idégenerering med `@AI`) saknar helt kodmässig grund, trots att det är en av de mest utförligt specificerade sektionerna i detta dokument — vilken prioritet ska den ges relativt övriga ofärdiga faser? | **Löst (v2.6): Hög prioritet — nästa gap att bygga.** |
| Granskningsrådet (Fas 2.97) saknar valprocess, ledamöter och uteslutningsmekanism i koden — flaggning av projekt/innehåll finns redan (Fas 2.97/5.76), men själva rådet gör det inte. Blockar detta lansering av crowdfunding och vinstdelning, som förutsätter en fungerande tvistlösningsinstans? | **Löst (v2.6): Ja, blockerande — crowdfunding och vinstdelning ska inte lanseras förrän Granskningsrådet finns på plats som tvistlösningsinstans. Hög prioritet att bygga.** |
| `legal_type` och hela ägarstrukturen i 4c saknar motsvarighet i databasschemat — bör detta byggas innan crowdfunding (Fas 3) eller vinstdelning (4a) går live, givet att fördelningslogiken i 4a förutsätter `legal_type`? | **Löst (v2.6): Ja, blockerande — `legal_type` måste finnas på plats innan crowdfunding/vinstdelning lanseras, eftersom 4a:s fördelningslogik förutsätter det.** |
| Projektchatt, diskussionsforum, videomöten och kalendersynkronisering (Fas 2.5) saknas helt i koden — enbart privata meddelanden (DM) och notifikationer är byggda (`kanaler`-rutten är bara en redirect-alias till DM-systemet, ingen egen kanalmodell). Räcker DM för lansering, eller krävs projektchatt/forum innan Fas 2.5 kan anses klar? | **Löst (v2.6): En riktig projektchattkanal (dedikerad kanalmodell, automatiskt skapad per projekt) krävs innan Fas 2.5 anses klar — dagens `kanaler`-redirect till DM-systemet räcker inte. Forum, videomöten och kalendersync kan vänta.** |
| Impact-fondens kapitalomfördelningsflöde (`impact_fund_ledger`, Fas 2.96) saknas i koden trots att impact-mätning redan finns — bör detta byggas i samma veva som vinstdelningslogiken i 4a, eftersom flödena är direkt beroende av varandra? | **Löst (v2.6): Ja — byggs tillsammans med vinstdelningslogiken i 4a som ett sammanhållet arbete.** |
| E2E-kryptering av privata meddelanden krävs uttryckligen i 5.30, men är inte implementerad i nuvarande DM-funktion — ska kravet mjukas upp, eller krävs det innan DM kan anses produktionsklar? | **Löst (v2.6): Kravet mjukat upp — 5.30 och 5.31 nedgraderar E2E från krav till möjlig framtida förbättring; kryptering i vila/transit (databas + TLS) räcker för nu.** |
| Idéflödets co-creation (versionshistorik, förslag à la pull request) och automatisk idé→projekt-pipeline (Fas 1.5) saknas i koden — redan noterat som "iteration 2" i §9, men bekräftat här som fortsatt öppet efter kodgranskning. | **Löst (v2.6): Prioritet höjd — flyttas upp bland de närmast liggande gapen, tidigare än §9:s ursprungliga "iteration 2"-placering.** |
| PWA/offline-stöd (5.75) saknas i koden — lägre prioritet, men noterat som gap mot Fas 5:s tillgänglighetskrav. | **Löst (v2.6): Låg prioritet bekräftad — byggs efter övriga högprioriterade gap.** |

---

## 11. Plattformens resa — Översikt

```
Problem → [Fas 1.2] Idégenerering → [Fas 1.5] Öppen Innovation →
[Fas 1] Projektformering → [Fas 2] Community & Matchmaking →
[Fas 2.5] Socialt samarbete → [Fas 2.8] Tribe Tokens & GT →
[Fas 2.9] AI-agenter → [Fas 2.95] Demokrati & Röstning →
[Fas 2.96] Impact-fond & kapitalomfördelning →
[Fas 2.97] Granskningsråd, uteslutning & etisk granskning →
[Fas 3] Crowdfunding → [Fas 3.5] Extern Fondansökan (framtid) →
[Fas 4] Skalning & Global Etablering

Genomgående i alla faser:
[Fas 5] Mänsklig Grund — Onboarding, Mentorskap, Lärande,
        Välmående, Tillgänglighet, Etik
```

## 12. Nästa steg

1. Validera PRD med intressenter
2. Låt jurist granska avtalsmallarna för kommersiella och ideella projekt (se 4c) samt gränsdragningen för tokensystemet (Fas 2.8)
3. Sätt upp Next.js + Supabase-projekt
4. Implementera autentisering (Google + magic link)
5. Bygg registreringsflöde och användarprofil
6. Designa databasschema i detalj
7. Bygg projektsida + Kanban (MVP Fas 1)
8. Lansera intern beta

---

*Detta dokument är levande och uppdateras kontinuerligt.*
