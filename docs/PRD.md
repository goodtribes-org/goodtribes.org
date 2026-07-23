# Product Requirements Document
## GoodTribes — Collaborative Impact Platform

**Version:** 4.12 (Draft)
**Datum:** 2026-07-23
**Status:** Under utveckling

**Ändringar i v4.12:**
- **Byggt:** `ImpactReport`-modellen (`impact_reports` i 4d) tillagd i Prisma-schemat — `projectId`, `sdgGoals[]`, `metricDescription`, `metricValue`, `verifiedById`/`verifiedAt` (nullable tills en verifierare, t.ex. Granskningsrådet eller site-admin, godkänner rapporten), `createdAt`. Migration `20260723090000_impact_reports`. Detta är bara datamodellen — själva `scale`→`impact`-gatingregeln som konsumerar tabellen är fortsatt "Föreslaget — ej beslutat" (se 4d/§10), och inget UI för att skapa/verifiera rapporter är byggt än.

**Ändringar i v4.11:**
- §12 "Nästa steg" skriven om helt. Föregående lista (sätta upp Next.js/Supabase-projekt, bygga inloggning, designa databasschema osv.) var kvar sedan dokumentets allra första version och beskrev inte längre verkligheten — kodbasen implementerar redan Utvecklingsfas 1–5 i stort, inklusive Granskningsrådet, Impact-fonden, Tribe Tokens, crowdfunding och fork-funktionen. Den nya listan speglar de faktiska kvarvarande gapen efter en genomgång av kod mot detta dokument: `impact_reports`-tabellen (krävs för `scale`→`impact`-gating, se 4d) saknas i schemat, de tre "Föreslaget — ej beslutat"-gatingvillkoren i 4d kräver ett formellt styrelsebeslut, innehållsmodereringen är fortsatt bara reaktiv (flaggning) utan proaktivt spamskydd, Utvecklingsfas 1.5:s co-creation (versionshistorik/idé-förslag) och automatiska idé→projekt-pipeline är obyggda, SSO/SAML och upphandlingsvänliga funktioner för institutioner är obyggda, samt de tre produktionsblockerande driftsgapen från "Known Issues" i CLAUDE.md (`REDIS_URL`, Strapi-schemaseparation, Stripe-nycklar) kvarstår.

**Ändringar i v4.10:**
- **Beslutat:** livscykelfasen `project` (se 4d) döpt om till **`sprint`** genomgående, i hela dokumentet (inklusive tidigare changelog-poster). Namnet krockade med Project-entiteten (`projects`-tabellen) som representerar hela initiativet från idé till impact, inte bara ett enskilt skede av det — "projekt" ska hädanefter alltid syfta på hela flödet/initiativet, aldrig på en enskild fas inom det. `projects.phase`-enumets värde `project` → `sprint` (databasnivå: `ALTER TYPE ... RENAME VALUE`, ingen datamigrering krävs — befintliga rader byter etikett automatiskt). Checklistan som tidigare kallades `project`-checklistan heter nu `sprint`-checklistan, samma innehåll (`todo_created`, `collaborators_invited`, `team_formed`, `resources_secured`).

**Ändringar i v4.9:**
- **Beslutat: v4.7:s sammanslagning av `idea`- och `sprint`-faserna rullas tillbaka.** `projects.phase` behåller alla sju värden (`idea`, `sprint`, `pilot`, `production`, `establish`, `scale`, `impact`) och Utvecklingsfas 1.5:s fristående idé-modell (`ideas`, `idea_votes`, `idea_comments`, `idea_revisions`) behålls också, skild från `projects` — implementationen bygger vidare på den redan befintliga, aldrig migrerade datamodellen istället för att genomföra v4.7:s riskfyllda schemamigrering. 4d och Utvecklingsfas 1.5 nedan är återställda till sin lydelse innan v4.7. v4.8:s Sandbox-namnbyte påverkas inte — det var en separat, orelaterad ändring.
- De två nya delstegen från v4.7 behålls däremot, nu kopplade till den riktiga (aldrig borttagna) `idea`-fasen istället för en påhittad delgrupp: `idea`-checklistan är `dream_defined` ("Beskriv idén"), `ai_reviewed` ("Be AI granska idén", ny), `peer_feedback_requested` ("Bjud in vänner att ge feedback"), `lean_canvas_created` ("Gör en Lean Canvas", ny). `sprint`-checklistan är oförändrad: `todo_created`, `collaborators_invited`, `team_formed`, `resources_secured`.
- **Beslutat:** att skapa ett projekt kräver fortsatt bara ett namn (redan sant sedan tidigare, se 5.3) — men efter skapandet möts initiativtagaren nu av en **idé-guide**: en valfri, stegvis genomgång av `idea`-fasens fyra delsteg (beskriv idén, be AI granska den, bjud in vänner, gör en Lean Canvas). Guiden kan hoppas över helt och hållet — då hamnar man direkt på sitt nya, tomma projekt precis som idag.
- **Beslutat:** fas- och stegwidgeten (se produktimplikation i 4d) är inte längre gömd bakom en "kom igång"-ruta synlig bara för ägare/admin. Den visas nu för alla besökare i projektets sidopanel, direkt under "Arbete" (Kanban-sammanfattningen) och ovanför "Uppgifter" — vem som helst kan se var i resan projektet befinner sig, men bara initiativtagaren/leads kan bocka av delsteg (samma rollkontroll som redan gäller för `toggleChecklistItem`).

**Ändringar i v4.8:**
- **Beslutat:** Sandlådan döpt om till **Sandbox** genomgående — sidan (`/sandladan` → `/sandbox`), navigeringen och samtliga omnämnanden i detta dokument. Ingen funktionell ändring, bara ett namnbyte (inklusive böjda former: `Sandlådans` → `Sandboxs`, `sandlåde-`-sammansättningar → `sandbox-`-sammansättningar, t.ex. `sandbox-innehåll`, `sandbox-tråd`).
- I navigeringen flyttades Sandbox samtidigt från att ligga under Utforska-menyn till en egen länk på samma nivå som Skapa och Utforska.
- Databastabellnamn som redan var engelska (`sandbox_feature_pilots`, `is_sandbox`, `sandbox_thread_lifted` m.fl.) påverkas inte — de använde redan "sandbox".

**Ändringar i v4.7:**
- **Beslutat:** `idea`- och `sprint`-faserna (se 4d) slås ihop till en enda fas, `idea` — fasenumret på `projects.phase` minskar från sju till sex värden. Löser att övergången `idea → sprint` ändå aldrig var en riktig gate (initiativtagaren beslutar alltid själv, se v3.3) — nu är hela vägen från lös idé till "redo att bygga" ett enda sammanhållet flöde i en widget, inte två faser med en osynlig gräns mellan sig.
- Delstegen inom den sammanslagna `idea`-fasen grupperas i widgeten under två numrerade rubriker istället för att vara knutna till separata `phase`-värden: **1. Idéfasen** (`dream_defined`, nya `ai_reviewed`, `peer_feedback_requested`, nya `lean_canvas_created`) och **2. Sprintfas** (`todo_created`, `collaborators_invited`, `team_formed`, `resources_secured`). Fortfarande fria till ordning och valfria att bocka av, se UI-princip i 4d.
- Två nya delsteg tillagda: `ai_reviewed` ("Be AI granska idén", återanvänder `@AI`-funktionen från Idéverkstaden, se 5.10) och `lean_canvas_created` ("Gör en Lean Canvas", länkar till planeringsverktyget i Sandbox, se 5.10).
- `initiative_checklist_items.phase` bytt till `group_number (1 | 2)`, eftersom kolumnen tidigare pekade mot ett `phase`-värde (`idea`/`sprint`) som inte längre finns kvar som separata faser i enumet
- Gating-tabellen i 4d: tidigare separata rader `idea → sprint` (Beslutat v3.3) och `sprint → pilot` (Beslutat) slås ihop till en enda rad `idea → pilot`, med samma krav som gamla `sprint → pilot` (team + resurser på plats) plus principen från v3.3 att själva beslutet aldrig kräver extern granskning
- **Beslutat:** ingen fristående "skapa idé"-väg längre — bara "Skapa projekt" (se 5.3), som startar direkt i den sammanslagna `idea`-fasen. Utvecklingsfas 1.5 (Öppen Innovation, 5.13–5.17) skrivits om i linje med detta: den tidigare fristående `ideas`-tabellen (med egen röstning, kommentarer och en separat "befordra till projekt"-mekanism) tas bort — en idé är redan ett projekt i `idea`-fasen, synligt i den vanliga projektdiscoveryn, med samma öppna röstning/kommentarer/co-creation som tidigare men riktad mot `project_id` istället för ett eget `idea_id`
- Motsvarande borttaget i navigationen: "Ny idé" ur Skapa-menyn och "Idéer" ur Utforska-menyn — Idéverkstaden och Sandbox (redan tillagda i Utforska, se v4.6) påverkas inte, de är separata mekanismer
- *(Notera: nuvarande kod har fortfarande en egen `Idea`-Prisma-modell skild från `Project`, med egna sidor `/ideas`, `/ideas/new`, `/ideas/[id]`. Den faktiska sammanslagningen av datamodellen är en separat, större migrering — inte gjord i samma steg som detta PRD-beslut.)*

**Ändringar i v4.6:**
- "Tokens i Sandbox" förtydligad med en uttalad grundprincip: **tokens som delas ut i Sandbox är värdelösa (ingen rösträtt, ingen vinstandel) förrän det de tillhör lyfts eller gafflas till den strukturerade delen av plattformen.**
- **Beslutat:** belöningen vid lyft är densamma oavsett om det resulterande projektet blir kommersiellt eller ideellt — eftersom nymyntade Tribe Tokens alltid ger rösträtt, och automatiskt ger vinstandel också om/när projektet blir kommersiellt (se 5.36), krävs ingen separat regel för de två fallen. Detta ersätter behovet av en särskild vinstdelningsregel för sandbox-ursprung.

**Ändringar i v4.5:**
- Ny subsektion "Tokens i Sandbox" (Utvecklingsfas 1.2). **Beslutat:** sandbox-aktivitet ger GT, inte Tribe Tokens — eftersom Tribe Tokens kräver ett projekt för att ge mening, och sandbox-innehåll ofta saknar det. Vid lyft/fork till ett riktigt projekt kan krediterade bidragsgivare även få nymyntade Tribe Tokens i det nya projektet, proportionellt mot dokumenterat bidrag.
- **Föreslaget, ej slutgiltigt beslutat:** GT mintas utfallsbaserat (när en tråd faktiskt lyfts/gafflas/konverteras) snarare än per inlägg, för att undvika spam/farming i en medvetet lågtröskelzon. Ny öppen fråga i punkt 10.
- `idea_contributors`/`fork_contributor_credits` utökade med `contribution_weight` som underlag för proportionell mintning

**Ändringar i v4.4:**
- **Namnkollision löst mellan 4f (Fork) och 5.65 (Projekt-franchising)**, som tidigare båda använde ordet "fork" för två olika saker:
  - **Skalning (5.65)** = initiativtagaren själv initierar regional replikering ELLER självvald uppdelning av sitt eget projekt (den senare, med organisation i toppen, flyttad hit från 4f:s tidigare "Scenario A")
  - **Fork (4f)** = permissionless kopia av vem som helst, oavsett tillstånd — 4f innehåller nu bara denna enda mekanism, ingen scenario-uppdelning längre
- 5.65 omdöpt till "Projekt-franchising & självvald uppdelning", ordet "forka" borttaget därifrån för att undvika kollision
- 4d:s gating-regel och upplåsningstabell för `establish → scale` uppdaterad till att inte längre använda ordet "fork"
- Verktygsbiblioteket (Lean Canvas, kundresa, fristående AI-idégenerering) — tidigare bara diskuterat i chatt, aldrig infört i dokumentet — infört nu som en del av **Sandboxs** innehåll snarare än en egen sektion, i linje med att det är experimentellt/informellt till sin natur
- Ny koppling: innehåll i Sandbox kan nu antingen "lyftas" (av upphovspersonen själv) eller **gafflas** (av vem som helst, via 4f) till ett riktigt projekt — två olika vägar med olika grad av tillstånd
- Öppna frågor i punkt 10 uppdaterade i linje med omstruktureringen

**Ändringar i v4.3:**
- Ny subsektion i Utvecklingsfas 1.2: "Sandbox — kreativt kaos". Ett tydligt märkt, öppet deklarerat experimentellt område som blandar AI-genererat innehåll, användarbidrag och piloter av nya plattformsfunktioner — löser cold start (se 4e) utan att kompromissa med kärnvärdet Öppenhet (§4)
- **Beslutat:** total transparens — Sandbox är permanent och konsekvent märkt som experimentell zon, inget smygande eller obetecknad blandning av AI/mänskligt innehåll
- **Beslutat:** bestående funktion, inte bara en lanseringsmekanism — finns kvar som ett friare inkubatorlager även efter att organisk aktivitet tagit fart
- Ny öppen fråga i punkt 10 om Granskningsrådets tillämpning i Sandbox givet högre volym och mer experimentell karaktär
- Ny databasutökning: `idea_threads.origin`/`is_sandbox` samt `sandbox_feature_pilots`

**Ändringar i v4.2:**
- Ny subsektion i 4d: "UI-princip — guide, inte tvång". Klargör att fas-/stegwidgeten (den som visar Idé → Sprint → Pilot → ... med delsteg) är en vägledning, inte en tvingande sekvens: **fasövergångarna förblir gated** enligt gating-tabellen, men **delstegen inom en fas (checklistan) är fria till ordning och valfria** — användaren kan hoppa över eller gå direkt till nästa fasövergång utan att ha bockat av alla delsteg
- Ny "Produktimplikation — fas- och stegwidget" i 4d: beskriver widgeten som visar hela vägen med expanderbara delsteg per fas
- Ny öppen fråga i punkt 10: om denna flexibilitet (låsta fasövergångar men fria delsteg) riskerar att förvirra användare i praktiken — flaggad för uppföljning med användartester efter lansering, inte ett beslut som kan verifieras i förväg

**Ändringar i v4.1:**
- Återinfört och utvidgat reconciliation-fixen mellan 4f (fork) och 4c som föll bort i en tidigare redigering (se v3.8): forkade projekt defaultar alltid till `nonprofit_umbrella`, ingen genväg runt 4c:s övergångsprocess — nu uppdaterad för att även täcka den nya `commercial_umbrella`-nivån (ett original som var `commercial_umbrella` eller `commercial_ab` ger ingen automatisk plats i samma struktur för forken)

**Ändringar i v4.0:**
- "GoodTribes Ventures AB" tillagt som exempelnamn på paraply-AB:et på fler ställen i 4c (databasschemats exempelrad, delegationsmeningen), utöver den ursprungliga nämningen i nivåtabellen. Endast ett exempelnamn, inte ett formellt beslutat bolagsnamn.

**Ändringar i v3.9:**
- 4c omstrukturerad: kommersiella projekt får nu **två nivåer**, symmetriskt med de ideella — **paraply-AB** (produktlinje under ett gemensamt, redan helägt Stiftelse-AB, ingen egen juridisk person) och **eget helägt aktiebolag** (full ansvarsisolering). Löser problemet att AB-registreringens tröskel (aktiekapital, avgifter, revisionskrav) annars är onödigt hög för ett litet kommersiellt pilotprojekt.
- **Viktigt förbehåll tillagt:** ansvarsisolering gäller fullt ut först vid eget AB — så länge ett projekt delar paraply-AB med andra gäller inte principen att ett projekts juridiska problem stannar inom det egna projektet
- `legal_type`-enumet utökat med `commercial_umbrella` (§7, 4c, `legal_type_change_requests`), ny tabell `commercial_umbrella_entities`, samt `projects.commercial_umbrella_entity_id`
- Övergångslogiken i 4c uppdaterad för att hantera knoppning mellan paraply-AB och eget AB, inte bara ideellt↔kommersiellt

**Ändringar i v3.8:**
- Ny subsektion i 4c: Skattemässig grund — allmännyttig stiftelse med helägda aktiebolag. Bekräftar att den redan valda strukturen (helägda AB, se 4c) är rätt väg skattemässigt, samt beskriver de fyra löpande kraven för att behålla skattebefrielsen (ändamålskravet, fullföljdskravet, verksamhetskravet, öppenhetskravet)
- Ny öppen fråga i punkt 10: fullföljdskravets faktiska efterlevnad (75–80% utdelning över rullande 5 år) bör stämmas av mot `impact_fund_ledger`/4a i samråd med jurist/revisor
- **Observera:** detta är en översiktlig karta, inte juridisk rådgivning — kräver genomgång med jurist/revisor specialiserad på stiftelserätt innan strukturen låses fast

**Ändringar i v3.7:**
- **Beslutat:** fork (se 4f) tillåts oavsett vilken fas (4d) originalprojektet befinner sig i — från `idea` till `impact`. Det forkade projektet ärver originalets fas vid gaffeltillfället och får sin egen fasövergångshistorik framåt.

**Ändringar i v3.6:**
- 4f uppdaterad: kompensation vid dissens-fork är nu tvådelad — **vinstandel är en obligatorisk miniminivå** (oförändrat sedan v3.4), medan **rösträtt via nymyntade Tribe Tokens till originalprojektets medlemmar blir ett valfritt tillägg** som gafflaren själv väljer att ge. Löser den tidigare motsättningen mellan "ingen rösträtt" och "vinstandel" — nu är det inte antingen/eller, utan ett garanterat golv plus en frivillig gest därutöver.
- Ny tabell `fork_token_grants` för att stödja den valfria tokentilldelningen

**Ändringar i v3.5:**
- **Beslutat:** vem som helst får initiera en dissens-fork (se 4f) — permissionless, precis som på GitHub, inget krav på tidigare aktivt bidrag i originalprojektet
- **Beslutat:** vid självvald uppdelning (Scenario A, se 4f) ägs den nya organisationen automatiskt av samma initiativtagare som originalprojektet

**Ändringar i v3.4:**
- Ny sektion 4f: Fork-funktion. Två scenarier definierade — självvald uppdelning (Scenario A, projekt läggs under en organisation) och dissens-fork (Scenario B, en medlem gafflar pga oenighet om riktning)
- **Beslutat för Scenario B:** ingen rösträtt/tokenandel i det nya projektet för originalets medlemmar, men en automatisk vinstandel om det forkade projektet blir kommersiellt (kopplas till befintlig vinstdelningslogik i 4a). Synlig härstamning och kreditering av originalets bidragsgivare är obligatoriskt.
- Ny tabell `fork_profit_shares` och `fork_contributor_credits`, samt `forked_from_project_id`/`fork_type` på `projects`
- Fem nya öppna frågor tillagda i punkt 10 om fork-funktionens detaljer (vem får gaffla, vilken fas/legal_type det resulterande projektet får, ägarskap av organisation, om vinstdelningsmodellen även gäller Scenario A)

**Ändringar i v3.3:**
- **Beslutat:** `idea` → `sprint` kräver ingen extern granskning. Initiativtagaren beslutar alltid själv om idén är redo att gå vidare till sprint-fasen — tar bort det tidigare förslaget om "peer review godkänd av minst N granskare". Se 4d.
- `peer_review_approved` (checklista, `idea`-fasen) ersatt med `peer_feedback_requested` — en valfri, informativ markering utan koppling till fasövergången. Jämförelsetabellen peer feedback vs. Granskningsrådet uppdaterad i linje med detta.
- **Beslutat:** Granskningsrådet agerar reaktivt, inte proaktivt — granskar inte projekt eller crowdfunding-kampanjer i förväg, endast vid inkommen anmälan. Tillagt i 5.54. Det tidigare beslutet att Granskningsrådet som institution måste finnas på plats innan crowdfunding-funktionen lanseras på plattformsnivå kvarstår oförändrat — det är en separat fråga om beredskap, inte förhandsgranskning per kampanj.

**Ändringar i v3.2:**
- 4d:s gating-tabell fylld i för de tre tidigare öppna övergångarna, tydligt markerade som **förslag, inte beslut**:
  - `pilot` → `production`: Tribe Token-röstning godkänner pilotresultat + milstolpe klar + resurser säkrade
  - `production` → `establish`: Projektpuls stabil i N månader utan öppet Granskningsråds-ärende — markerad som svagast underbyggd, kräver styrelsediskussion
  - `scale` → `impact`: minst en fork har nått `establish` + verifierade SDG-resultat
- Ny tabell `impact_reports` tillagd i 4d och §7 för att stödja verifiering av SDG-resultat
- Motsvarande tre öppna frågor i punkt 10 uppdaterade till "Föreslaget" med hänvisning till 4d

**Ändringar i v3.1:**
- Ny sektion 4e: Lanseringsstrategi — Cold start. Fem principer (single-player-värde först, koncentrerad första kohort, aktiv användning av `production`/`establish`-ingången för seed-innehåll, flaggskeppsprojekt, geografisk koncentration före global skalning) samt två föreslagna produktfunktioner: admin-kuratering av seed-innehåll och inbjudningskoder för grundarkohort
- Öppen fråga i punkt 10 om cold start uppdaterad till "delvis löst" — strategin är ett förstahandsförslag, inte slutgiltigt beslutad

**Ändringar i v3.0:**
- 4d klargjord: `peer_review_approved` (delsteg i `idea`-fasen) är en separat mekanism från Granskningsrådet — proaktiv kvalitetsgranskning av peers, inte reaktiv regelefterlevnad. Öppen fråga i punkt 10 löst.
- 5.53/Grundprincip (Utvecklingsfas 2.97) utökad: Granskningsrådet kan nu explicit granska och besluta om uteslutning av **organisationer**, inte bara användare och projekt — organisationer är en egen entitet i plattformen (se §3, §7) och saknades tidigare i Granskningsrådets uttalade mandat
- `exclusion_cases`-schemat (5.55) omstrukturerat: separata nullable-fält för `reported_user_id` / `reported_project_id` / `reported_org_id`, samt ett eget `scope_project_id` för att skilja "uteslutning från ett projekt" från "vem anmälan gäller" — tidigare version blandade ihop dessa två betydelser i samma fält

**Ändringar i v2.9:**
- Namnkonflikten från v2.7/v2.8 löst: plattformens utrullningsordning bytt från "Fas X" till **"Utvecklingsfas X"** genomgående (91 förekomster) — särskiljer nu tydligt från livscykelfaserna i 4d (`idea`, `sprint`, `pilot`, `production`, `establish`, `scale`, `impact`), som fortsatt kallas "fas" i löptext eftersom sammanhanget redan är otvetydigt där
- Öppen fråga i punkt 10 om namnkonflikten markerad som löst

**Ändringar i v2.8:**
- Fasnamnet `mvp` bytt till `pilot` i 4d, 7 och samtliga referenser — "MVP" är teknikjargong som inte passar naturligt för offentlig sektor och akademia (se målgrupp, §3), och kolliderade dessutom med den redan etablerade betydelsen "MVP" i §9 (plattformens egen lanseringsscope) och §4b (inloggningsprioritet). Bytet till `pilot` löser båda namnkollisionerna på en gång.
- Namnkonflikten mellan livscykelfaserna (4d) och "Fas"-numreringen (§11) kvarstår som öppen fråga — se punkt 10.

**Ändringar i v2.7:**
- Ny sektion 4d: Initiativets livscykel (fasmodell) — formaliserar `projects.phase` som en 7-värdes enum (`idea`, `sprint`, `pilot`, `production`, `establish`, `scale`, `impact`), ersätter det tidigare enkla statusfältet `Idé / Aktiv / Avslutad` i 5.1
- §5.1 uppdaterat för att peka mot 4d istället för att definiera status inline
- §7 databasschema uppdaterat: `projects.status` → `projects.phase` (enum), nya tabeller `phase_transitions` och `initiative_checklist_items`
- Nya öppna frågor tillagda i punkt 10: tre av sex gating-villkor mellan faserna är ännu inte beslutade (pilot→production, production→establish, scale→impact)
- **Namnkonflikt flaggad:** ordet "fas" används redan i detta dokument för utvecklings-/utrullningsordning (Utvecklingsfas 1, Utvecklingsfas 1.2, Utvecklingsfas 2.8 osv, se §11). Den nya livscykelmodellen i 4d beskriver istället var ett enskilt initiativ befinner sig, inte i vilken ordning plattformens funktioner byggs. Se öppen fråga i punkt 10 — namnen bör troligen särskiljas innan Claude Code implementerar, annars är risken stor för sammanblandning i kod och kommunikation.

**Ändringar i v2.6:**
- §9 MVP-scope uppdaterat: Tribe Tokens & GT (Utvecklingsfas 2.8) flyttat från "Ej inkluderat" till "Inkluderat i MVP" — produkten har redan gått förbi det ursprungliga scopet på den punkten
- Samtliga 10 öppna frågor från v2.5:s kodgranskning triagerade och beslutade (se punkt 10 för fullständiga motiveringar):
  - Google-inloggning — nedprioriterad för nu
  - Idéverkstaden (Utvecklingsfas 1.2) — hög prioritet, nästa gap att bygga
  - Granskningsrådet (Utvecklingsfas 2.97) — blockerar lansering av crowdfunding/vinstdelning
  - `legal_type`/4c-ägarstruktur — blockerar lansering av crowdfunding/vinstdelning
  - Projektchatt (Utvecklingsfas 2.5) — riktig kanalmodell krävs, dagens `kanaler`-redirect till DM räcker inte
  - Impact-fondens ledger (Utvecklingsfas 2.96) — byggs tillsammans med vinstdelningslogiken i 4a
  - E2E-kryptering av DM (5.30/5.31) — kravet nedgraderat till kryptering i vila/transit
  - Idéflödets co-creation & idé→projekt-pipeline (Utvecklingsfas 1.5) — prioritet höjd från "iteration 2"
  - PWA/offline-stöd (5.75) — låg prioritet bekräftad

**Ändringar i v2.5:**
- Nya öppna frågor tillagda i punkt 10, baserade på en kodgranskning som jämförde detta dokument mot nuvarande implementation i `goodtribes-org/goodtribes.org` — se tabellen för detaljer per fas

**Ändringar i v2.4:**
- Tribe Tokens: bytt från timbaserad estimering till prioritetsbaserad poängsättning (låg/normal/hög/bråttom) med lås vid uppgiftsstart
- Ny övergripande GoodTribes Token (GT), separat från projektens lokala Tribe Tokens — se 4c och Utvecklingsfas 2.8
- Ny sektion 4c: Ägarstruktur & juridisk form (kommersiella AB helägda av stiftelsen, ideella projekt under paraply vs. egen förening)
- Ny Utvecklingsfas 2.96: Impact-fond & kapitalomfördelning
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
GoodTribes styrelse lägger fram ett förslag om hur stor andel av vinsten som ska gå till **Stiftelsens dagliga drift** respektive **Impact-fonden** (se Utvecklingsfas 2.96). Projektets Tribe Token-innehavare röstar om förslaget, proportionellt mot sitt tokeninnehav (se Utvecklingsfas 2.95). Styrelsen har vetorätt om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet.

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
- Plattformsavgiften på crowdfunding kräver inga extra tillstånd i Sverige — sedan finansiärer får Tribe Tokens istället för aktier (se Utvecklingsfas 3, 5.56) krävs inte Finansinspektionens tillstånd för equity-crowdfunding
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
| LinkedIn | Utvecklingsfas 2 | Relevant för organisationer och professionella |
| E-post + lösenord | Utvecklingsfas 2 | För användare utan Google-konto |
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
- Onboarding-guide startar automatiskt (Utvecklingsfas 5)
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

Varje projekt på GoodTribes är operativt självständigt — styrt av sin initiativtagare och sina medlemmar genom Tribe Tokens-röstning (se Utvecklingsfas 2.95) — men den juridiska formen skiljer sig beroende på om projektet är kommersiellt eller ideellt.

---

**Kommersiella projekt — två nivåer**

| Nivå | Beskrivning | Passar för |
|---|---|---|
| Under gemensamt paraply-AB | Ingen egen juridisk person. Projektet drivs som en intern produktlinje under ett befintligt, helägt Stiftelse-AB (t.ex. "GoodTribes Ventures AB") tillsammans med andra tidiga kommersiella projekt. | Nystartade kommersiella projekt, innan behovet av ett eget AB motiverar kostnaden |
| Eget helägt aktiebolag | Fristående AB, till 100% ägt av Stiftelsen GoodTribes, med eget organisationsnummer. | Projekt som vuxit i omsättning eller risk och motiverar ansvarsisolering |

- **Ansvarsisolering gäller fullt ut först vid eget AB.** Så länge ett projekt delar paraply-AB med andra projekt gäller *inte* principen att ett projekts juridiska problem eller konkurs stannar inom det egna projektet — ett problem i en produktlinje kan i teorin påverka andra produktlinjer i samma bolag. Detta är den viktigaste avvägningen mot att undvika AB-registreringens tröskel (aktiekapital, registreringsavgift, löpande bokförings-/revisionskrav).
- Stiftelsen delegerar, som ensam aktieägare (direkt eller via paraply-AB:et, t.ex. "GoodTribes Ventures AB"), det löpande operativa beslutsmandatet (produktriktning, prioritering, mindre budgetbeslut) till respektive projekts Tribe Token-röstning — oavsett nivå.
- Stiftelsen behåller alltid vetorätt i frågor om: byte av styrelse/vd, ändring av bolagsordning, större investeringar, varumärkesanvändning, samt frågor som utgör juridisk eller finansiell risk — inklusive vetorätt över fördelningen av vinstutdelning (se 4a) om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet.
- Vinst går som utdelning till Stiftelsen (för paraply-nivån: internt fördelad per produktlinje innan utdelning). Projektets Tribe Token-innehavare röstar därefter, proportionellt mot sitt tokeninnehav, om hur överskottet fördelas — t.ex. andel till Impact-fonden, andel till projektets eget vinstdelningsprogram, eller reinvestering (se 4a och Utvecklingsfas 2.96).
- Regleras genom ett **delegations- och anslutningsavtal** mellan Stiftelsen och respektive AB, eller för paraply-nivån ett internt produktlinjeavtal med paraply-AB:et (se separat avtalsmall).
- Stiftelsen fastställer tröskelvärden (t.ex. omsättning, teamstorlek, juridisk risknivå) för när ett projekt måste knoppas av till eget AB. *(Öppen fråga — se punkt 10: exakta tröskelvärden ej beslutade — jämför motsvarande öppna fråga för ideella tröskelvärden nedan.)*
- Att bedriva kommersiell verksamhet direkt i Stiftelsen utan mellanliggande AB (varken paraply eller eget) rekommenderas inte — se skattemässig grund nedan.

**Ideella projekt — två nivåer**

| Nivå | Beskrivning | Passar för |
|---|---|---|
| Under Stiftelsens paraply | Ingen egen juridisk person. Stiftelsen är juridisk huvudman, hanterar alla medel och bär det yttersta ansvaret. Projektledaren saknar egen firmateckningsrätt. | Nystartade, mindre initiativ |
| Egen ideell förening | Full autonomi, eget organisationsnummer, egen styrelse och bankkonto. | Projekt som vuxit i omfattning och medlemsantal |

- Projekt under paraplyet regleras genom ett **verksamhetsavtal** med Stiftelsen (se separat avtalsmall) som reglerar ekonomisk hantering, beslutsmandat och ansvar.
- Stiftelsen fastställer tröskelvärden (t.ex. antal aktiva medlemmar, ekonomisk omsättning) för när ett projekt kan ansöka om att knoppas av till egen förening. *(Öppen fråga — se punkt 10: exakta tröskelvärden ej beslutade.)*

**Övergång mellan juridisk form**

- Projektets medlemmar kan rösta, viktat mot Tribe Token-innehav (se Utvecklingsfas 2.95), om att föreslå en ändring av `legal_type` — t.ex. från ideellt till kommersiellt (paraply eller eget AB), eller tvärtom.
- Ett godkänt röstresultat är en **begäran**, inte en automatisk ändring: Stiftelsen genomför den faktiska juridiska övergången, eftersom den kräver verkliga steg (ansluta till/bilda eller avveckla ett aktiebolag, teckna nytt avtal enligt 4c, hantera eventuella skattekonsekvenser).
- Vid övergång från ideellt till kommersiellt: projektet ansluts som produktlinje under paraply-AB:et, eller ett nytt eget aktiebolag bildas (helägt av Stiftelsen) om tröskelvärdena för eget AB redan är uppfyllda, och ett delegations- eller anslutningsavtal tecknas enligt ovan.
- Vid övergång mellan paraply-AB och eget AB (i endera riktningen): produktlinjen knoppas av från/in i paraply-AB:et. Kräver inte samma juridiska tyngd som att bilda/avveckla ett helt bolag, men regleras fortfarande genom uppdaterat avtal.
- Vid övergång från kommersiellt till ideellt: Stiftelsen (som redan äger bolaget/paraply-AB:et till 100%) beslutar om avveckling eller ombildning, i samråd med projektets medlemmar.
- Stiftelsen kan avslå en begäran om övergång om den bedöms medföra oskälig juridisk, ekonomisk eller skattemässig risk.
- *(Öppen fråga — se punkt 10: exakt tidsram och process för hur Stiftelsen hanterar en godkänd övergångsbegäran är inte specificerad.)*

**Databasutökning**
```
legal_type_change_requests
  id, project_id, requested_type (commercial_umbrella | commercial_ab | nonprofit_umbrella | nonprofit_own_assoc)
  poll_id, status (pending | approved_by_members | executed | rejected_by_foundation)
  decided_at, executed_at, created_at

commercial_umbrella_entities
  id, name, foundation_ab_org_number, created_at
  -- exempelrad: name = "GoodTribes Ventures AB"

projects
  commercial_umbrella_entity_id (nullable) — sätts om legal_type = commercial_umbrella, se 7
```

**Juridiska principer som gäller oavsett projektform**

- Inga tokens (Tribe Tokens eller GT) representerar ägande, aktier eller är fritt överlåtbara — se Utvecklingsfas 2.8.
- Allt faktiskt penningflöde (utdelning, donationer, ersättningar) sker i vanlig valuta via Stripe Connect, aldrig som en tokentransaktion.
- Avtalsmallar för båda projekttyperna finns som separat bilaga till detta dokument (`avtal/kommersiellt-projekt-mall.docx` och `avtal/ideellt-projekt-mall.docx`) och ska granskas av jurist per projekt innan signering.

---

**Skattemässig grund — allmännyttig stiftelse med helägda aktiebolag**

*(Detta är en översiktlig karta, inte juridisk rådgivning. Stiftelserätt och skatterätt avgörs av era faktiska stadgar och Skatteverkets bedömning — anlita jurist/revisor specialiserad på stiftelserätt innan strukturen låses fast.)*

En svensk stiftelse får driva näringsverksamhet, men hur det görs avgör skatteutfallet:

- **Vald modell (helägda AB, se ovan) är rätt väg.** AB:et betalar vanlig bolagsskatt (20,6%). Utdelning från AB:et till Stiftelsen är normalt **skattefri**, förutsatt att Stiftelsen räknas som **allmännyttig**. Detta är den etablerade svenska modellen (jämförbart med t.ex. forskningsstiftelser som äger operativa bolag).
- Alternativet — att Stiftelsen bedriver näringsverksamhet direkt utan mellanliggande AB — beskattas i regel som vanlig näringsverksamhet och är juridiskt mer riskabelt. Inte den valda vägen för GoodTribes.

**Fyra löpande krav för att behålla skattebefrielsen (inkomstskattelagen):**

| Krav | Innebörd | Koppling till GoodTribes |
|---|---|---|
| Ändamålskravet | Stiftelsens ändamål i stiftelseförordnandet måste falla inom erkända allmännyttiga kategorier (social hjälpverksamhet, utbildning, vetenskap, kultur m.fl.) | Agenda 2030-inriktningen behöver formuleras så den tydligt faller inom dessa kategorier — ordalydelsen i stadgarna spelar roll |
| Fullföljdskravet | I storleksordningen 75–80% av avkastningen ska delas ut till ändamålet, bedömt över en rullande period (normalt ca 5 år) | Samma grundprincip som `impact_fund_ledger` (se Utvecklingsfas 2.96) redan bygger på — pengar ska faktiskt flöda till projekt, inte bara ackumuleras i Stiftelsen |
| Verksamhetskravet | Stiftelsen ska faktiskt bedriva eller finansiera verksamhet i linje med ändamålet, inte bara passivt förvalta kapital | Uppfylls löpande genom aktiv drift av plattformen och dess projekt |
| Öppenhetskravet | Ändamålet får inte vara orimligt begränsat till en alltför sluten krets av mottagare | I linje med plattformens öppna, globala inriktning |

**Tillsyn:** Stiftelsen och dess AB:n står under Länsstyrelsens tillsyn, med registreringsplikt om tillgångarna överstiger vissa gränsvärden, samt krav på auktoriserad revisor vid en viss verksamhetsstorlek.

*(Öppen fråga — se punkt 10: fullföljdskravets faktiska efterlevnad bör stämmas av mot den planerade utdelningstakten i `impact_fund_ledger` och vinstdelningslogiken i 4a, i samråd med jurist/revisor — ingen konkret siffra är verifierad ännu.)*

---

## 4d. Initiativets livscykel (fasmodell)

Varje initiativ på GoodTribes — oavsett om det startar som en lös idé eller som ett färdigt koncept som är redo att köra — rör sig genom samma sju faser. Faserna representerar mognadsgrad, inte separata verktyg: ett initiativ är alltid samma underliggande objekt i databasen, bara med olika `phase`-värde.

**Designprincip:** användaren ska kunna starta där den befinner sig. Ny idé → börja i `idea`. Redan validerad lösning i drift → skapa initiativet direkt i `production`. Alla faser är alltid tillgängliga som startpunkt; inget tvingar en användare att passera faser den redan klarat av utanför plattformen.

---

**Fasenum (databasfält: `projects.phase`)**

| Värde (enum) | Svensk etikett | Beskrivning |
|---|---|---|
| `idea` | Idé | AI-assisterad idéfas (se Utvecklingsfas 1.2/1.5), peer review, community-feedback |
| `sprint` | Sprint | Uppgiftsnedbrytning (to-do), bjuda in medskapare, formera team, säkra resurser |
| `pilot` | Pilot | Utveckling och pilot i liten skala (prototyp) |
| `production` | Produktion | Skarp drift |
| `establish` | Etablera | Stabil lokal verksamhet |
| `scale` | Skala | Regional replikering / fork till nya instanser |
| `impact` | Impact | Mätning och rapportering — kulmen av kontinuerlig mätning som pågår från `idea` |

Fasen lagras som en enum-kolumn, aldrig fritext. Övergångar sker endast framåt (ingen backwards-transition i v1). Varje övergång loggas:

```
phase_transitions
  id, project_id, from_phase, to_phase, changed_by, changed_at
```

**Undantag för startpunkt:** ett initiativ kan skapas direkt i vilken fas som helst (se designprincip ovan) — `phase_transitions` får då bara en rad med `from_phase = null`. Det är inte ett brott mot "endast framåt"-regeln, bara initiativets första registrerade fas.

---

**UI-princip — guide, inte tvång**

Den fasmodell och de delsteg som beskrivs nedan (och den widget som visar dem, se produktimplikation nedan) är en **vägledning för användaren, inte en tvingande arbetsordning.** Detta gäller på två nivåer, med olika grad av flexibilitet:

- **Fasövergångarna (`idea` → `sprint` → `pilot` → ...) är och förblir gated**, enligt gating-tabellen nedan — de styr vilka funktioner som låses upp och kan inte hoppas över.
- **Delstegen inom en fas (checklistan, t.ex. `dream_defined`, `peer_feedback_requested`, `todo_created`) är däremot fria till ordning och valfria att bocka av.** Användaren kan göra dem i vilken ordning som helst, hoppa över dem, eller gå direkt till fasövergången utan att ha bockat av alla — checklistan är en hjälp att se vad som brukar behövas, inte en spärr. Widgeten visar väg och framsteg ("2 av 5 klara"), men låser aldrig ett steg bakom ett annat.

Detta skiljer sig medvetet från t.ex. gating-tabellen mellan faser, som fortsatt är strikt. Om detta blir förvirrande i praktiken (användare som inte förstår varför vissa steg är låsta och andra inte) är det en öppen fråga att följa upp efter lansering — se punkt 10.

---

**Delsteg inom `idea`- och `sprint`-faserna (UI-checklista, inte egna enum-värden)**

Dessa var ursprungligen skissade som egna toppnivåfaser (idea/dream, peer review, to-do, invite, team, resources) men fungerar bättre som en checklista/progress-bar inuti `idea` och `sprint` — annars får `phase`-fältet 11+ värden där flertalet bara betyder "fortfarande i sprintfasen, delsteg X", vilket gör frågor som "visa alla aktiva projekt" svåra att uttrycka.

```
initiative_checklist_items
  id, project_id, phase (idea | sprint), item_key, completed_at, completed_by
```

| `phase` | `item_key`-värden |
|---|---|
| `idea` | `dream_defined` ("Beskriv idén"), `ai_reviewed` ("Be AI granska idén" *(ny, v4.7)* — återanvänder `@AI` från Idéverkstaden, se 5.10), `peer_feedback_requested` ("Bjud in vänner att ge feedback", valfritt, se nedan), `lean_canvas_created` ("Gör en Lean Canvas" *(ny, v4.7)* — länkar till planeringsverktyget i Sandbox, se 5.10) |
| `sprint` | `todo_created` ("Fyll på med arbetsuppgifter"), `collaborators_invited` ("Bjud in medskapare"), `team_formed` ("Formera team"), `resources_secured` ("Säkra resurser") |

**Peer review är valfri feedback, inte ett godkännandekrav — beslutet om `idea → sprint` tas alltid av initiativtagaren själv.** Community-feedback (via idéflödet, se Utvecklingsfas 1.2/1.5) kan hjälpa initiativtagaren att förbättra idén, men ingen extern granskning eller antal granskare krävs för att gå vidare. `peer_feedback_requested` är därför bara en informativ markering — inte en spärr — och ersätter det tidigare `peer_review_approved`, som antydde ett godkännandekrav som inte längre gäller.

**Peer feedback vs. Granskningsrådet — två separata mekanismer:** även om peer feedback inte är ett krav, är det fortfarande värt att skilja den från Granskningsrådet (se Utvecklingsfas 2.97), eftersom de har helt olika syften:

| | Peer feedback (`idea`-fasen) | Granskningsrådet |
|---|---|---|
| **Syfte** | Valfri kvalitetsfeedback — hjälper initiativtagaren förbättra idén | Reaktiv regelefterlevnad — bryter en användare, ett projekt eller en organisation mot plattformens regler? |
| **Utlöses av** | Initiativtagaren själv, om denne vill ha feedback | En anmälan/flaggning från någon annan |
| **Beslutar om fasövergång?** | Nej — initiativtagaren beslutar alltid själv | Ej tillämpligt — rör inte fasövergångar, endast regelbrott |
| **Vem granskar** | Övriga community-medlemmar (peers), inget valt organ | Det community-valda Granskningsrådet, se 5.53 |
| **Möjlig konsekvens** | Feedback för omarbetning, men aldrig ett stopp | Åtgärder inklusive uteslutning av användare, projekt eller organisation |

Detta är inte längre en öppen fråga — se punkt 10.

---

**Övergångsvillkor (gating rules)**

| Övergång | Krav för att låsa upp | Status |
|---|---|---|
| `idea` → `sprint` | Initiativtagaren beslutar själv — inget krav på extern granskning eller antal granskare. Peer feedback (se ovan) är valfri och påverkar inte beslutet. | **Beslutat (v3.3)** |
| `sprint` → `pilot` | Team tilldelat + budget/resurser definierade | Beslutat |
| `pilot` → `production` | Tribe Token-röstning bland projektmedlemmar godkänner pilotresultatet (se Utvecklingsfas 2.95) + minst en milstolpe markerad klar (se 5.74) + `resources_secured` uppfyllt för fortsatt drift | **Föreslaget — ej formellt beslutat, se punkt 10** |
| `production` → `establish` | Projektpuls (se 5.74) stabil över ett tröskelvärde i N sammanhängande månader, utan öppet allvarligt ärende hos Granskningsrådet (se 5.55) | **Föreslaget — svagast underbyggt av de tre, tröskelvärde N och ev. variation per `legal_type` (se 4c) kräver styrelsediskussion, se punkt 10** |
| `establish` → `scale` | Initiativtagare initierar regional replikering eller självvald uppdelning (se 5.65) | Beslutat |
| `scale` → `impact` | Minst en replikerad instans (fork) har själv nått `establish` + mätbara SDG-resultat rapporterade och verifierade (kräver ny `impact_reports`-tabell, se nedan) | **Föreslaget — ej formellt beslutat, se punkt 10** |

> Rader markerade "Öppen" ska INTE tolkas som spec av Claude Code. Bygg gating-logiken som ett konfigurerbart regelverk (t.ex. en funktion per övergång) snarare än hårdkodade villkor, så att öppna rader kan fyllas i utan omskrivning.

---

**Vad varje fasövergång låser upp (funktionsnivå)**

| Övergång | Låser upp |
|---|---|
| `idea` → `sprint` | Kanban-board skapas (se Utvecklingsfas 1), `initiativtagare`-roll tilldelas formellt |
| `sprint` → `pilot` | Tribe Tokens börjar delas ut för uppgifter (se Utvecklingsfas 2.8) |
| `pilot` → `production` | Skarp driftmiljö aktiveras för projektet *(exakt vilka funktioner — ej slutgiltigt beslutat, se punkt 10)* |
| `establish` → `scale` | Crowdfunding-modul (se Utvecklingsfas 3) + regional replikering & självvald uppdelning (se Utvecklingsfas 4, 5.65) |
| `scale` → `impact` | Impact-rapportering, publik impact-dashboard |

---

**Produktimplikation — fas- och stegwidget**

Projektsidan visar en widget med hela vägen (Idé → Sprint → Pilot → Produktion → Etablera → Skala → Impact), där varje fas kan expanderas för att se sina delsteg. Widgeten är en visuell guide och framstegsindikator — se "UI-princip" ovan för vad som är låst (fasövergångar) och vad som är fritt (delsteg inom en fas).

**Beslutat (v4.9):** widgeten är inte längre gömd bakom en "kom igång"-ruta synlig bara för ägare/admin — den visas för alla besökare, direkt i projektsidans sidopanel under "Arbete" (Kanban-sammanfattningen) och ovanför "Uppgifter". Vem som helst kan se var i resan projektet befinner sig; bara initiativtagaren/leads kan bocka av delsteg (samma rollkontroll som redan gäller för avbockning av checklistan).

---

**Databasutökning — fasmodell**

```
projects
  phase (idea | sprint | pilot | production | establish | scale | impact) — ersätter tidigare status-fält, se 7

phase_transitions
  id, project_id, from_phase (nullable), to_phase, changed_by, changed_at

initiative_checklist_items
  id, project_id, phase (idea | sprint), item_key, completed_at, completed_by

impact_reports
  id, project_id, sdg_goals[], metric_description, metric_value, verified_by, verified_at, created_at
```

---

## 4e. Lanseringsstrategi — Cold start

GoodTribes är en tvåsidig marknadsplats (initiativtagare *och* bidragsgivare behövs samtidigt för att kännas levande) där community- och matchmaking-funktionerna dessutom ökar i värde med volym. Det klassiska hönan-och-ägget-problemet gäller alltså dubbelt. Denna sektion beskriver hur de första ~100 aktiva projekten och ~1000 medlemmarna nås innan nätverkseffekten bär plattformen själv.

*(Öppen fråga — se punkt 10: den exakta strategin nedan är ett förstahandsförslag, inte slutgiltigt beslutad.)*

---

**Princip 1 — Bygg för "single-player" innan "multiplayer"**

Idégenereringsverktyget (AI-assisterad idéfas, se Utvecklingsfas 1.2) ska ge fullt värde till en enda inloggad användare, utan att någon annan behöver vara aktiv på plattformen samtidigt. Detta är den funktion som ska vara mest komplett och polerad *innan* lansering — peer review, matchmaking och community-discovery kan komma senare i en användares resa och är beroende av att andra användare redan finns.

**Princip 2 — Koncentrerad första kohort, inte bred lansering**

Istället för att sprida marknadsföringskanalerna i §3 brett och tunt från start, väljs medvetet en avgränsad grupp (t.ex. en skola, en kommun eller ett existerande nätverk) att fylla plattformen med på djupet. Täthet inom en grupp gör att sociala funktioner (chatt, matchmaking, discovery) känns levande för de första användarna, istället för tomma på en gles, global yta.

**Princip 3 — Använd `production`/`establish`-ingången aktivt för seed-innehåll**

Fasmodellen (se 4d) tillåter redan att ett initiativ skapas direkt i `production` eller `establish`. Denna ingång används aktivt i lanseringsfasen: befintliga ideella föreningar, kommunprojekt eller forskningsinitiativ som redan bedriver SDG-arbete bjuds in att **registrera sitt pågående arbete**, snarare än att starta om från idé. Det ger plattformen trovärdigt, verkligt innehåll från dag ett.

**Princip 4 — Flaggskeppsprojekt**

Minst ett fullt genomlevt exempelinitiativ (idé → projekt → pilot → produktion) drivs av GoodTribes själva, som konkret showcase för nya användare.

**Princip 5 — Geografisk koncentration innan global skalning**

Modellen bevisas i en region (Sverige, i linje med befintlig målgrupp inom offentlig sektor/akademia, se §3) innan `scale`-fasens regionala replikering (se 4d, Utvecklingsfas 4) triggas mot nya regioner.

---

**Produktimplikationer**

| Funktion | Beskrivning | Prioritet |
|---|---|---|
| Admin-kuratering av seed-innehåll | Administratörer kan skapa/importera showcase-initiativ direkt i valfri fas (t.ex. `production`) utan att gå igenom hela flödet, för att fylla plattformen med trovärdigt innehåll före publik lansering | Föreslagen MVP-tillägg |
| Inbjudningskoder för grundarkohort | En avgränsad första användargrupp bjuds in via kod, ger möjlighet att spåra och särskilja "grundarkohorten" i statistik och ev. framtida erkännande (t.ex. ett badge) | Föreslagen MVP-tillägg |

**Databasutökning**

```
seed_initiatives
  id, project_id, curated_by_admin_id, source_description, created_at

founder_cohort_invites
  id, code, invited_email (nullable), redeemed_by_user_id (nullable)
  redeemed_at, created_at
```

---

## 4f. Fork-funktion

Inspirerat av GitHub ska ett projekt kunna "gafflas" av vem som helst — kopieras till ett nytt, oberoende projekt utan tillstånd från initiativtagaren. Detta är principiellt skilt från **Skalning** (se Utvecklingsfas 4, 5.65), där initiativtagaren *själv* väljer att dela upp sitt växande projekt i flera under en gemensam organisation — de två begreppen använde tidigare båda ordet "fork", vilket skapade en namnkollision. Nu är de tydligt åtskilda:

- **Skalning** = initiativtagaren själv initierar uppdelning/expansion av sitt eget projekt (se 5.65)
- **Fork** = vem som helst kopierar projektet, utan tillstånd — typiskt vid dissens ("jag tycker projektet går åt fel håll"), men motivet kan också vara nyfikenhet eller att testa en egen variant

En fork resulterar alltid i ett nytt, fristående projekt (eller under gafflarens egen organisation, om denne har en) — aldrig en "instans" kopplad till ett globalt nätverk under originalet, vilket särskiljer det från Skalningens `project_instances`-modell.

---

**Beslutat — Kompensation vid fork**

- **Obligatorisk miniminivå: vinstandel.** Om det forkade projektet någon gång blir vinstdrivande (`commercial_ab`, se 4c), avsätts automatiskt en andel av dess framtida vinstdelning (se 4a, Steg 2) till originalprojektets bidragsgivare, proportionellt mot deras Tribe Token-innehav i originalet vid gaffeltillfället. Detta rör sig i riktig valuta via Stripe Connect, inte som tokentransaktion — bryter alltså inte mot principen att tokens aldrig växlas mot pengar. Detta gäller alltid, oavsett vad gafflaren väljer nedan.
- **Valfritt tillägg: rösträtt via nymyntade tokens.** Utöver miniminivån kan personen som gafflar **själv välja** att även ge Tribe Tokens (och därmed rösträtt, se Utvecklingsfas 2.95) i det nya projektet till en eller flera av originalprojektets medlemmar. Detta är alltid ett aktivt, frivilligt val av gafflaren — aldrig automatiskt eller ett krav. Eftersom det handlar om nymyntade tokens i det nya projektet (inte en flytt eller växling av befintliga tokens) bryter detta inte mot principen att Tribe Tokens är strikt projektlokala (se 4c).
- **Synlig härstamning och kreditering är obligatoriskt.** Det nya projektet ska tydligt visa att det är en fork av originalprojektet, med länk till detta, samt kreditera de medlemmar som bidrog till originalet.

---

**Beslutat (v4.1) — `legal_type` vid fork, reconciliation med 4c**

Fork-funktionen kopierar ett projekts *data* (snapshot, medlemskap, historik) till ett nytt `project_id` — men den kopierar aldrig en juridisk person eller en plats i ett befintligt AB. Det forkade projektet är alltid en juridiskt blank slate, oavsett vilken `legal_type` originalet hade — inklusive om originalet var `commercial_umbrella` eller `commercial_ab` (se den nya tvånivåstrukturen för kommersiella projekt i 4c):

- **Default vid skapande: `nonprofit_umbrella`, för alla forkar, oavsett originalets `legal_type`.** Detta är samma default som gäller för varje nyskapat projekt på plattformen — den lägsta juridiska tröskeln, inget särfall för forkar. Att sätta denna default kräver ingen handling från Stiftelsen vid gaffeltillfället, eftersom `nonprofit_umbrella` är projektets normala vilostatus — det är inte en *övergång* i 4c:s mening, bara startvärdet.
- **Ingen genväg runt 4c:s övergångsprocess.** Vill det forkade projektets medlemmar senare bli `commercial_umbrella` (ansluta som produktlinje under ett paraply-AB), eget `commercial_ab`, eller `nonprofit_own_assoc`, gäller exakt samma process som för alla andra projekt: röstning bland forkens medlemmar + Stiftelsen genomför den faktiska juridiska övergången (`legal_type_change_requests`, se 4c).
- **Specialfall — originalet var `commercial_umbrella` eller `commercial_ab`:** forken ärver *inte* originalets plats i ett paraply-AB eller dess eget aktiebolag. Anslutning eller nybildning kräver samma beslutsprocess som för ett helt nytt projekt utan fork-koppling.

---

**Fork av innehåll i Sandbox**

Fork-mekanismen gäller inte bara etablerade projekt — en tråd eller idé i Sandbox (se Utvecklingsfas 1.2) kan också gafflas ut till ett eget, fristående projekt av vem som helst, som ett alternativ till att "lyfta" den via den vanliga promotion-vägen. Skillnaden: att "lyfta" en tråd är den ursprungliga bidragsgivarens/initiativtagarens egna val (se Sandbox, Utvecklingsfas 1.2), medan en fork av sandbox-innehåll kan göras av vem som helst, utan tillstånd — samma permissionless-princip som fork av riktiga projekt.

---

**Fortsatt öppna frågor om fork-funktionen**

| Fråga | Status |
|---|---|
| Vem får initiera en fork — vem som helst som följer projektet, eller krävs tidigare aktivt bidrag (Tribe Tokens intjänade)? | **Beslutat (v3.5): Vem som helst, permissionless precis som på GitHub — inget krav på tidigare aktivt bidrag.** |
| Vilken fas (se 4d) hamnar det forkade projektet i — samma fas som originalet hade vid gaffeltillfället, eller alltid `idea`? | **Beslutat (v3.7): Fork tillåts oavsett fas — `idea` t.o.m. `impact`. Det forkade projektet ärver originalets fas vid gaffeltillfället, med egen fasövergångshistorik framåt.** |
| Vilken `legal_type` (se 4c) får det forkade projektet vid skapande, om originalet var `commercial_umbrella` eller `commercial_ab` (ägt av/anslutet till Stiftelsen, som inte automatiskt gäller forken)? | **Beslutat (v4.1): `nonprofit_umbrella` som default för alla forkar, ingen genväg runt 4c:s vanliga övergångsprocess. Se ovan.** |
| Blandas Granskningsrådet in vid en fork? | Löst: Nej, i linje med den reaktiva principen (se 5.54) — en fork är aldrig i sig ett regelbrott, bara en funktion. Rådet blandas bara in om någon faktiskt anmäler något |

---

**Databasutökning — fork**

```
projects
  forked_from_project_id (nullable) — kompletterar befintliga fält, se 7
  forked_from_sandbox_thread_id (nullable) — sätts om forken utgår från en sandbox-tråd snarare än ett etablerat projekt
  -- legal_type sätts alltid till nonprofit_umbrella vid gaffling, oavsett originalets legal_type — se "Beslutat (v4.1)" ovan

fork_contributor_credits
  id, forked_project_id, original_project_id, credited_user_id, created_at

fork_profit_shares
  id, forked_project_id, original_project_id, original_contributor_user_id
  share_percent — proportionellt mot original_contributor_user_id:s Tribe Token-innehav i originalet vid gaffeltillfället
  created_at

fork_token_grants
  id, forked_project_id, original_project_id, original_contributor_user_id
  tribe_tokens_granted — sätts av gafflaren, helt valfritt, ger rösträtt i det nya projektet (se Utvecklingsfas 2.95)
  granted_by, created_at
```

`fork_profit_shares` kopplas till den befintliga vinstdelningslogiken i 4a (Steg 2) — när det forkade projektet delar ut vinst, allokeras en andel enligt denna tabell innan/parallellt med den vanliga `personal_profit_allocations`-flödet.

---

## 5. Features — Prioritetsordning

### Utvecklingsfas 1 — Projekthantering (MVP)

Målet är att ge initiativtagare ett kraftfullt men enkelt verktyg för att driva sitt arbete.

**5.1 Projektsida**
- Titel, beskrivning, kategori och taggar
- Projektbild / banner
- **Fas** — se 4d för fullständig fasmodell (`idea` / `sprint` / `pilot` / `production` / `establish` / `scale` / `impact`)
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
- Fondkatalogen (Utvecklingsfas 3.5) matchar automatiskt mot fonder som finansierar specifika SDG-mål
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
- **Juridisk form** (`legal_type`, se 4c): Kommersiellt (paraply-AB eller eget helägt AB) / Ideellt (under Stiftelsens paraply eller egen förening). Avgör vilket avtal som gäller för projektet (delegations-/anslutningsavtal, internt produktlinjeavtal, eller verksamhetsavtal, se 4c).

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
- Prioritet: Låg / Normal / Hög / Bråttom (avgör tokenvärde, se Utvecklingsfas 2.8)
- Status: Att göra / Pågår / Granskning / Klart
- Grupperbar i namngivna listor (t.ex. "Sprint 1", "Möte 2026-07-01")
- Bifoga filer och länkar

**Prioritet och lås:**
- Initiativtagaren eller admin sätter prioritet vid skapande — se Utvecklingsfas 2.8 (5.32) för fullständig logik kring låsning och tokenvärde
- Prioriteten kan ändras fritt medan uppgiften ligger i "Att göra", men låses automatiskt när den flyttas till "Pågår"
- Gäller oavsett om uppgiften skapas som ett Kanban-kort eller en snabb todo-punkt

**Tokens:**
- Alla godkända uppgifter ger Tribe Tokens enligt sin låsta prioritet: Låg = 10, Normal = 20, Hög = 30, Bråttom = 40 (se Utvecklingsfas 2.8)
- Ingen minimitröskel — även den minsta uppgiften ger sitt fulla prioritetsvärde när den godkänns

**AI-agent:**
- Knappen "Tilldela AI" finns på alla uppgifter (text och research)
- Tribe Tokens för AI-utförda uppgifter går till GoodTribes (se Utvecklingsfas 2.9, 5.41)

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
| **Initiativtagare** | Personen som startade projektet. Fullständig kontroll. Kan inte tas bort av andra medlemmar i projektet — men kan uteslutas av GoodTribes Granskningsråd vid grov misskötsel eller regelbrott (se Utvecklingsfas 2.97). *Notera: rollen innebär ansvar och mandat att leda projektet, inte juridiskt ägarskap — se 4c för hur äganderätten faktiskt är strukturerad.* |
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
- Projektets medlemmar röstar fram en efterträdare genom en Tribe Token-viktad omröstning (se Utvecklingsfas 2.95), på samma sätt som övriga projektbeslut
- Initiativtagaren kan nominera en kandidat, men rösten avgör — nomineringen är inte bindande
- Fram till att en efterträdare är vald och bekräftad behåller den avgående initiativtagaren rollen, för att undvika ett ledarskapsvakuum
- Skiljer sig från uteslutning via Granskningsrådet (Utvecklingsfas 2.97): detta är ett frivilligt, planerat maktskifte, inte en disciplinär åtgärd
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

### Utvecklingsfas 1.2 — Kollaborativ Idégenerering

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
- En idé kan sparas till Idéflödet (Utvecklingsfas 1.5) för vidare community-feedback
- Eller konverteras direkt till ett nytt projekt — med AI som automatiskt genererar projektbeskrivning, milstolpar och startuppgifter
- Alla som deltagit i tråden notifieras när ett projekt skapas och erbjuds att gå med

---

**Inne i ett befintligt projekt:**
- Projektmedlemmar kan starta en intern idésession
- Bara projektmedlemmar ser och deltar
- AI har tillgång till projektets befintliga kontext: beskrivning, milstolpar, uppgifter och wiki
- Används för: lösa utmaningar, hitta nya angreppssätt, planera nästa fas

---

**Sandbox — kreativt kaos**

Ett tydligt avgränsat, öppet deklarerat område där GoodTribes själva blandar AI-genererat innehåll med användarbidrag, och testar nya tjänster, funktioner och idéer innan de eventuellt lyfts in i den strukturerade delen av plattformen. Detta löser cold start-problemet (se 4e) genom att rummet aldrig känns tomt, samtidigt som det bevarar plattformens kärnvärde Öppenhet (§4).

**Grundprincip — total transparens, inget smygande**
> Sandbox är märkt tydligt och konsekvent som experimentell zon. Besökare vet alltid att de befinner sig där, och att innehåll och funktioner där kan vara AI-genererade, halvfärdiga eller under test. Detta gäller genomgående — aldrig en engångsdisclaimer som glöms bort.

- **Vad som blandas där:** AI-genererade problemställningar och idéfrön (för att ge volym och liv), användarnas egna trådar och kommentarer, fristående planeringsverktyg (se nedan), samt piloter av nya plattformsfunktioner som ännu inte är redo för full lansering
- **Tydlig, permanent märkning** — inte en subtil färgnyans, utan en konsekvent, väl synlig indikation (t.ex. rubrik, bakgrundston och etikett) som gör klart att man är i Sandbox, på varje sida och i varje tråd där
- **Ingen retroaktiv gissning krävs** — istället för att fråga "är detta AI eller människa?" post för post, är hela zonen deklarerad som en plats där båda blandas fritt och öppet
- **Lyft till strukturerad idé eller projekt** — precis som i Idéverkstaden (se 5.16) kan en tråd i Sandbox "lyftas" till Idéflödet (Utvecklingsfas 1.5) för bredare feedback, eller konverteras direkt till ett projekt i `idea`-fasen (se 4d) — samma mekanik (`converted_to_project_id`) återanvänds. "Lyft" är alltid den ursprungliga bidragsgivarens/initiativtagarens eget val.
- **Fork av sandbox-innehåll** — som ett alternativ till att lyfta en tråd kan vem som helst istället **gaffla** den till ett eget, fristående projekt (se 4f) — permissionless, utan tillstånd från den som postade ursprungligen. Samma kompensationsprincip (vinstandel, valfria tokens, kreditering, se 4f) gäller.
- **Funktionspiloter** — nya tjänster eller funktioner kan testas skarpt med riktiga, informerade användare i Sandbox innan de rullas ut brett, tydligt märkta som "Experimentell funktion — testas i Sandbox"
- **Bestående funktion, inte bara lanseringsknuff** — Sandbox finns kvar även efter att organisk aktivitet tagit fart, som ett permanent, friare inkubatorlager ovanför den strukturerade plattformen

*(Öppen fråga — se punkt 10: gäller Granskningsrådets reaktiva princip (se 5.54) även innehåll i Sandbox, eller behövs en lättare, snabbare moderering där givet den högre volymen och mer experimentella karaktären?)*

---

**Planeringsverktyg i Sandbox**

Ett bibliotek med fristående planerings- och idégenereringsverktyg, som en del av Sandboxs kreativa kaos snarare än en egen sektion av plattformen. Fungerar som en lågtröskel-ingång för att testa och forma en idé.

- Varje verktygsinstans (t.ex. en ifylld Lean Canvas) skapas antingen **privat** (bara skaparen ser den) eller **delbar/kollaborativ** (flera kan redigera tillsammans) — användaren väljer detta vid skapande
- En ifylld canvas kan när som helst **"lyftas" eller "gafflas"** till ett riktigt projekt i `idea`-fasen (se 4d och ovan) — innehållet förifyller projektets grundfält (titel, beskrivning, målgrupp, ev. SDG-koppling)

| Verktyg | Syfte |
|---|---|
| Lean Canvas | Enkelsidig affärs-/idémodell — problem, lösning, målgrupp, kanaler, intäkter |
| Kundresa (Customer Journey Map) | Kartlägga målgruppens steg, behov och kontaktpunkter |
| AI-assisterad idégenerering | Samma AI-drivna brainstorming som redan finns i idéflödet (se ovan), tillgänglig fristående |

*(Öppen fråga — se punkt 10: exakt vilka ytterligare ramverk, t.ex. Business Model Canvas eller SWOT, som ska ingå från start vs. läggas till senare är inte bestämt.)*

---

**Tokens i Sandbox**

Aktivitet i Sandbox ska räknas och belönas — men *vilken* tokentyp kräver eftertanke, eftersom Tribe Tokens är strikt projektlokala (se 4c, Utvecklingsfas 2.8) och sandbox-innehåll ofta inte är kopplat till något projekt än.

**Grundprincip — värdelöst tills lyft, sedan riktigt**
> Tokens som delas ut i Sandbox har inget värde (ingen rösträtt, ingen vinstandel) förrän det de tillhör faktiskt lyfts eller gafflas till den strukturerade delen av GoodTribes. Vid det tillfället konverteras dokumenterat bidrag till riktiga, nymyntade Tribe Tokens i det nya projektet — som sedan fungerar precis som alla andra Tribe Tokens.

- **Sandbox-aktivitet räknas löpande som GT (GoodTribes Token), inte Tribe Tokens** — eftersom Tribe Tokens kräver ett `project_id` för att ge mening, och sandbox-innehåll ofta saknar projekt tills det lyfts eller gafflas. GT fungerar här som ett bokfört, ännu inte inlöst bidrag snarare än ett direkt värde i sig (se 5.41 för samma princip vid GoodTribes eget bidrag).
- **Belöningen är densamma oavsett om resultatet blir kommersiellt eller ideellt.** Vid lyft eller fork till ett riktigt projekt tilldelas bidragsgivare som krediterats (`idea_contributors`, `fork_contributor_credits`) **nymyntade Tribe Tokens** i det nya projektet, proportionellt mot sitt dokumenterade bidrag. Eftersom Tribe Tokens alltid ger rösträtt (se 2.95) — och *dessutom* automatiskt ger rätt till vinstandel om/när projektet är eller blir kommersiellt (se 5.36, 4a) — behövs ingen separat regel för de två utfallen: samma mekanism täcker båda. Detta är alltså en ny mynting i det nya projektet, inte en växling av redan intjänad GT (håller sig innanför principen i 4c att tokens aldrig konverteras mellan nivåer eller projekt).
- **Förslag — utfallsbaserad mintning, inte per inlägg:** GT tilldelas när ett bidrag leder till ett konkret utfall (tråden lyfts till Idéflödet, konverteras till projekt, eller gafflas), snarare än för varje enskilt inlägg. Sandbox är medvetet lågtröskel och friare modererad (se öppen fråga ovan om Granskningsrådet) — att ge GT per inlägg riskerar spam/farming på ett sätt som är svårare att fånga i efterhand än i resten av plattformen. *(Föreslaget, ej slutgiltigt beslutat — se punkt 10.)*
- Gäller lika för trådar och canvas-verktyg (Lean Canvas m.fl., se ovan) — samma modell, GT bokförs vid bidrag, riktiga Tribe Tokens mintas vid promotion till projekt.

*(Öppen fråga — se punkt 10: exakt GT-belopp per sandbox-bidrag, samt om utfallsbaserad mintning är rätt avvägning eller om viss GT ändå bör ges löpande för aktivt deltagande.)*

**Databasutökning — Sandbox**

```
idea_threads
  origin (human | ai_seed), is_sandbox (bool) — kompletterar befintlig tabell, se 5.12

sandbox_feature_pilots
  id, feature_key, description, status (piloting | rolled_out | discontinued)
  started_at, ended_at, created_by

canvas_instances
  id, tool_type (lean_canvas | customer_journey | ai_ideation), owner_user_id
  visibility (private | shared), created_at, updated_at

canvas_collaborators
  id, canvas_instance_id, user_id, role (editor | viewer), added_at

canvas_field_values
  id, canvas_instance_id, field_key, field_value, updated_at, updated_by

canvas_promotions
  id, canvas_instance_id, promoted_to_project_id (nullable), forked_to_project_id (nullable)
  promoted_by, promoted_at

-- Tokens i Sandbox återanvänder befintliga tabeller (se Utvecklingsfas 2.8, 5.37):
-- platform_token_ledger (GT) — reason = 'sandbox_thread_lifted' | 'sandbox_thread_forked' | 'sandbox_canvas_promoted'
-- idea_contributors / fork_contributor_credits utökas med:
--   contribution_weight (numeric) — underlag för proportionell Tribe Token-mintning vid promotion till projekt
```

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

### Utvecklingsfas 1.5 — Öppen Innovation

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

### Utvecklingsfas 2 — Community & Matchmaking

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

### Utvecklingsfas 2.5 — Sociala & Kommunikationsfunktioner

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

### Utvecklingsfas 2.8 — Tribe Tokens & GoodTribes Token (dubbla nivåer)

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
- Tribe Tokens ger rösträtt inom det egna projektet (1 token = 1 röst, se Utvecklingsfas 2.95)
- GT ger rösträtt på plattformsnivå: prioritering av produktutveckling, policyfrågor, och fördelning av Impact-fondens medel (se Utvecklingsfas 2.96)
- I kommersiella projekt ger Tribe Tokens underlag för en andel av vinstutdelningen (efter styrelsens föreslagna andel till drift och Impact-fond) — som innehavaren själv väljer att rikta till valfritt projekt på plattformen, se 4a. Tokens representerar aldrig aktier eller ägande i sig (se 4c)
- Plattformsstatus: "Core Contributor", "Top Builder" etc. baserat på GT
- Prioriterad matchmaking — högt GT-saldo ger mer synlighet
- Vid crowdfunding: token-innehavare kan erbjudas förtur eller rabatt

**5.37 Databasutökning för Tribe Tokens & GT**

```
(priority och priority_locked_at definieras redan på tasks-tabellen, se Utvecklingsfas 1 — Databasutökning för unified tasks)

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

### Utvecklingsfas 2.9 — AI-agenter som projektmedlemmar

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
- **GoodTribes tilldelas Tribe Tokens** (projektlokala, inte GT) motsvarande uppgiftens fulla prioritetsvärde — som ersättning för att plattformen tillhandahåller AI-kapaciteten. Detta ger GoodTribes rösträtt inom just det projektet, i linje med Utvecklingsfas 2.95
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

### Utvecklingsfas 2.95 — Token-viktad röstning (Projektdemokrati)

Målet är att ge projektmedlemmar reellt inflytande över projektbeslut — proportionellt mot deras faktiska bidrag. Den som arbetat mest har störst röststyrka.

**Grundprincip**
> Antal tillgängliga röster = antal Tribe Tokens intjänade i projektet

Detta gäller projektnivån specifikt. GT ger separat rösträtt på plattformsnivå (se Utvecklingsfas 2.96) — de två röstsystemen är alltid åtskilda, precis som tokennivåerna de bygger på (se Utvecklingsfas 2.8).

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
- Vissa omröstningar initieras av GoodTribes styrelse snarare än initiativtagaren (t.ex. fördelning av vinstutdelning, se Utvecklingsfas 2.96) — dessa är bindande men med vetorätt för styrelsen om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet

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

### Utvecklingsfas 2.96 — Impact-fond & kapitalomfördelning

Målet är att kanalisera kapital från vinstdrivande projekt till Stiftelsens drift och till nya projekt som behöver hjälp att komma igång — ett av GoodTribes centrala syften — utan att detta sker via tokenväxling (se juridisk gränsdragning i Utvecklingsfas 2.8 och 4c). Flödet sker i vanlig valuta, styrt av tydliga, loggade beslutssteg.

Impact-fonden är specifikt inriktad på **uppstartskapital** — att hjälpa nya (företrädesvis ideella) projekt över den första tröskeln, snarare än att vara ett generellt löpande stöd till redan etablerade projekt.

**Grundprincip**
> Tokens styr *vem som bestämmer*. Pengar rör sig alltid som vanliga kronor via Stripe Connect — aldrig som en tokentransaktion.

---

**5.50 Kapitalflödet**
1. Ett kommersiellt AB (helägt av Stiftelsen, se 4c) genererar vinst och lämnar utdelning till Stiftelsen enligt gällande aktiebolagsrättsliga regler.
2. GoodTribes styrelse lägger fram ett förslag om hur stor andel av utdelningen som ska gå till **Stiftelsens dagliga drift** respektive **Impact-fonden**. Projektets Tribe Token-innehavare röstar om förslaget, proportionellt mot sitt tokeninnehav. Detta är ett delegerat beslutsmandat enligt avtalet i 4c — men styrelsen har vetorätt om utfallet skulle utgöra en fara för Stiftelsens fortsatta verksamhet.
3. Den andel som röstas till Impact-fonden tillförs fonden. Resterande del (efter drift och Impact-fond) fördelas till varje bidragsgivare proportionellt mot deras Tribe Token-innehav, och var och en väljer sedan själv vilket eller vilka GoodTribes-projekt de vill rikta sin del till (se 4a, Steg 2).
4. Stiftelsen fördelar Impact-fondens samlade medel som uppstartskapital till nya projekt — antingen genom en ansökningsprocess (se Utvecklingsfas 3.5, Extern Fondansökan) eller genom en separat plattformsomfattande GT-röstning om vilka projekt som ska prioriteras en given period.
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

### Utvecklingsfas 2.97 — Granskningsråd, uteslutning & etisk granskning

Målet är att ge communityn en oberoende, demokratiskt vald instans för att hantera allvarliga fall av regelbrott eller misskötsel — utan att förlita sig på ensidiga beslut från Stiftelsen eller ett enskilt projekts initiativtagare. Rådet är plattformens enda granskningsorgan: det hanterar uteslutning av användare, projekt och organisationer, samt etisk granskning av flaggade projekt (se Utvecklingsfas 5, 5.76 för det senare).

**Grundprincip**
> Communityn röstar fram ett Granskningsråd genom GT (plattformsnivå). Rådet utreder och beslutar om uteslutning av en användare, ett projekt eller en organisation som misstänks bryta mot GoodTribes regler — samt om huruvida flaggade projekt bryter mot GoodTribes etiska riktlinjer.

---

**5.53 Granskningsrådet**
- Rådet väljs av communityn genom en GT-viktad omröstning (se Utvecklingsfas 2.95/2.96 för röstningsmekanik), för en bestämd mandatperiod
- Rådet utreder anmälningar om grov misskötsel, regelbrott eller uppförande som skadar GoodTribes eller enskilda projekt — riktade mot **användare, projekt eller organisationer** — samt projekt som flaggats som potentiellt oetiska eller skadliga (se Utvecklingsfas 5, 5.76)
- Rådet kan besluta om: uteslutning av en användare, ett projekt eller en organisation (från en specifik del av plattformen eller från hela GoodTribes), mildare åtgärder (varning, tillfällig avstängning), eller — för flaggade projekt — godkännande, varning eller nedstängning
- Beslut kräver majoritet inom rådet och ska motiveras skriftligt
- Den anmälda personen, organisationen eller projektets initiativtagare har rätt att bemöta anmälan innan beslut fattas
- *(Öppna frågor — se punkt 10: antal ledamöter, mandatperiodens längd, och exakt valprocess är inte specificerade.)*

**5.54 Förhållande till andra beslutsinstanser**
- Rådets mandat gäller uppförande, regelbrott och etisk lämplighet — inte affärsbeslut. Stiftelsens vetorätt i kommersiella projekt (se 4c) gäller specifikt juridisk eller finansiell risk för Stiftelsen, en separat fråga
- Initiativtagaren kan uteslutas av Granskningsrådet vid grov misskötsel, trots att rollhierarkin (5.5) annars anger att initiativtagaren inte kan tas bort av andra medlemmar i projektet
- Rådets beslut är bindande men kan i undantagsfall överklagas till Stiftelsens styrelse, t.ex. om beslutet bedöms strida mot grundläggande rättssäkerhet
- **Reaktiv princip (beslutat v3.3):** Granskningsrådet agerar endast utifrån inkomna anmälningar/flaggningar. Rådet granskar inte projekt proaktivt och stoppar inte ett enskilt projekts crowdfunding-kampanj (se Utvecklingsfas 3) i förväg — endast om en anmälan kommit in som tyder på regelbrott. Det tidigare kravet på att Granskningsrådet ska finnas på plats innan crowdfunding-*funktionen* lanseras på plattformsnivå (se punkt 10) gäller fortfarande — det handlar om att en fungerande tvistlösningsinstans ska existera *om* något går fel, inte om förhandsgranskning av varje kampanj

**5.55 Databasutökning**

```
review_council_members
  id, user_id, term_start, term_end, elected_via_poll_id

exclusion_cases
  id, reported_user_id (nullable), reported_project_id (nullable), reported_org_id (nullable) — exakt en av dessa tre ska vara satt, anger vem anmälan gäller
  scope_project_id (nullable) — endast relevant om reported_user_id är satt: begränsar en ev. uteslutning till detta projekt. Null = plattformsomfattande
  reported_by, reason, status (open | under_review | resolved)
  decision (none | warning | ban)
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

### Utvecklingsfas 3 — Crowdfunding & Finansiering

Målet är att koppla ekonomiska resurser till verifierade projekt.

**5.56 Finansieringskampanjer**
- Mål, deadline och progress bar
- Belöningsnivåer (Kickstarter-modell) eller donationsbaserad
- **Token-baserad finansiering** — finansiärer får Tribe Tokens i projektet, proportionellt mot sitt bidrag, enligt en växelkurs som initiativtagaren sätter vid kampanjskapande (t.ex. "100 kr = 1 Tribe Token"). Detta ger samma rösträtt (se Utvecklingsfas 2.95) och, om projektet är kommersiellt, samma rätt till andel av vinstfördelningen (se 4a, Steg 2) som bidragsgivare som tjänat tokens genom arbete. Inga aktier säljs — Stiftelsens ägande av eventuellt AB (se 4c) påverkas aldrig, och Finansinspektionens equity-crowdfunding-tillstånd krävs inte.

**5.57 Betalningar**
- Stripe Connect för globala betalningar
- Stöd för kort, banköverföring och lokala betalmetoder
- Automatisk utbetalning vid uppnått mål

**5.58 Transparens & rapportering**
- Finansiärerna ser hur medlen används
- Koppling mellan utgifter och projektmilstolpar
- Exporterbar rapport för redovisning

---

### Utvecklingsfas 3.5 — Extern Fondansökan ⚠️ Framtida fas

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

### Utvecklingsfas 4 — Skalning & Global Etablering

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

**5.65 Projekt-franchising & självvald uppdelning**

Ett projekt kan officiellt öppna sig för replikering — andra användare kan ansöka om att öppna en regional instans av projektet. Detta skiljer sig medvetet från Fork-funktionen (se 4f): här initierar och godkänner initiativtagaren själva expansionen, och instanserna hör ihop i ett gemensamt nätverk — det är inte en permissionless kopia.

*Regional replikering (flera geografiska instanser av samma projekt):*
- Initiativtagaren aktiverar "Öppen för replikering" på projektsidan
- Intresserade användare ansöker om att starta en lokal instans
- Godkänd instans får: projektets wiki, milstolpar och uppgiftsmallar som startpunkt
- Alla instanser kopplas till ett globalt nätverk under ursprungsprojektet — oavsett om ursprungsprojektet är kommersiellt eller ideellt (se 4c), varje instans har sin egen juridiska form
- Ursprungsprojektet kan sätta riktlinjer som alla instanser måste följa
- Instansernas framsteg och tokens är synliga i ett globalt dashboard

*Självvald uppdelning (ett växande projekt delar upp sig i flera under en gemensam organisation):*
- Initiativtagaren väljer själv att dela upp sitt projekt i flera delprojekt, i takt med att verksamheten växer och naturligt separeras i olika grenar
- Flödet: (1) en organisation skapas om den inte redan finns (`organizations`, se §7), med samma initiativtagare som huvudprojektet, (2) delprojekten skapas som nya, självständiga projekt kopplade till organisationen (`org_id` sätts)
- Till skillnad från regional replikering ovan handlar detta inte om samma projekt på flera platser, utan om att splittra ett och samma växande initiativ i flera separata, men organisatoriskt sammanhållna, projekt
- Delprojekten ärver *ingen* automatisk juridisk koppling till ursprungsprojektets `legal_type` (samma princip som för fork, se 4f) — varje delprojekt gör sitt eget val av juridisk form via den vanliga övergångsprocessen (4c)

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
  -- används för regional replikering. Självvald uppdelning (se 5.65) kräver ingen egen tabell —
  -- återanvänder organizations och projects.org_id (se §7)

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

### Utvecklingsfas 5 — Mänsklig Grund

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
- **Granskningsrådet** granskar flaggade projekt — samma community-valda organ som hanterar uteslutning av användare (se Utvecklingsfas 2.97), snarare än en separat kommitté
- **AI-förhandsgranskning** — när ett projekt skapas analyserar AI beskrivningen och varnar om innehållet bryter mot riktlinjerna
- **Transparensrapport** — GoodTribes publicerar kvartalsvis en rapport om flaggade projekt, beslut och åtgärder
- **Överklagandeprocess** — initiativtagare kan överklaga ett beslut om nedstängning till Stiftelsens styrelse (se Utvecklingsfas 2.97, 5.54)

*(Databasschema för flaggning och etisk granskning finns i Utvecklingsfas 2.97, 5.55 — samma tabeller används för båda typerna av granskning.)*

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
  id, title, description, visibility, category, initiator_user_id, org_id, created_at
  phase (idea | project | pilot | production | establish | scale | impact) — se 4d
  legal_type (commercial_umbrella | commercial_ab | nonprofit_umbrella | nonprofit_own_assoc) — se 4c
commercial_umbrella_entity_id (nullable) — se 4c

phase_transitions
  id, project_id, from_phase (nullable), to_phase, changed_by, changed_at — se 4d

initiative_checklist_items
  id, project_id, phase (idea | project), item_key, completed_at, completed_by — se 4d

impact_reports
  id, project_id, sdg_goals[], metric_description, metric_value, verified_by, verified_at, created_at — se 4d

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
- Tjäna Tribe Tokens både för arbetsinsats och för finansiella bidrag (se Utvecklingsfas 3, 5.56)
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
- Idéflöde med röstning och kommentarer (Utvecklingsfas 1.5 grundnivå)
- Tribe Tokens & GT (se Utvecklingsfas 2.8) — prioritetsbaserad tokenutdelning på Kanban-uppgifter *(tillagd i v2.6 — redan byggt och i drift, se punkt 10)*

**Ej inkluderat i MVP:**
- Crowdfunding och betalningar
- AI-matchmaking
- Token-baserad finansiering (crowdfunding mot Tribe Tokens)
- Avancerad rapportering
- Co-creation (versionshistorik och pull requests för idéer — Utvecklingsfas 1.5, prioritet höjd i v2.6, se punkt 10)

---

## 10. Öppna frågor

| Fråga | Status |
|---|---|
| Equity crowdfunding — vilka jurisdiktioner stödjs från start? | **Löst (v2.4): Inte längre relevant — finansiärer får Tribe Tokens istället för aktier, se Utvecklingsfas 3 (5.56).** |
| Vem sätter gränser för växelkursen kr→Tribe Tokens vid finansieringskampanjer — fritt av initiativtagaren, eller med en plattformsrekommenderad standard? | Öppen |
| Moderering av projekt och innehåll | **Delvis löst (v2.4): Uteslutning av användare och etisk granskning av flaggade projekt hanteras båda av samma community-valda Granskningsråd, se Utvecklingsfas 2.97 och 5.76. Löpande innehållsmoderering (spam, olämpliga kommentarer etc.) är fortfarande öppen.** |
| Freemium vs. prenumerationsmodell | Öppen |
| Hur hanteras projekt i flera språk? | Öppen |
| Vilken valuta används som standard? | Öppen |
| Kan Tribe Tokens eller GT någonsin lösas in mot pengar? (påverkar juridisk klassificering) | **Löst (v2.4): Nej, aldrig. Se Utvecklingsfas 2.8 och 4c** |
| Vad händer med tokens om ett projekt läggs ner? | Öppen |
| Hur hanteras missbruk — t.ex. uppblåsta prioritetssättningar? | Öppen |
| Vilken AI-kostnad bär plattformen vs. initiativtagaren för agentuppgifter? | Öppen |
| Ska AI-agentens leveranser vara synliga publikt eller bara för projektmedlemmar? | Öppen |
| Exakt procentsats för GT-spegling vid tokenmintning (standard 10% föreslaget) | Öppen |
| Tak på individuellt röstinflytande per projekt (t.ex. `sqrt(tokens)` eller procenttak)? | Öppen |
| Exakta tröskelvärden för när ett ideellt projekt får knoppas av till egen förening | Öppen |
| Vinstdelningsprocent mellan kommersiellt AB och Stiftelsen | **Löst (v2.4): Inte en fast procentsats — 100% av vinsten går till Stiftelsen som ägare, och projektets Tribe Token-innehavare röstar om hur överskottet därefter fördelas. Se 4a och Utvecklingsfas 2.96.** |
| Vinstfördelning: minimibelopp till drift/Impact-fond utan att röstas bort | **Löst (v2.4): Styrelsen föreslår andelen till drift och Impact-fond, medlemmarna röstar, styrelsen har vetorätt vid fara för Stiftelsens fortsatta verksamhet. Se 4a och Utvecklingsfas 2.96.** |
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
| Strategi för att lösa cold start-problemet — hur nås de första ~100 aktiva projekten och ~1000 medlemmarna innan nätverkseffekten bär plattformen själv? | **Delvis löst (v3.1): Se ny sektion 4e för fem principer och två föreslagna produktfunktioner (admin-kuratering av seed-innehåll, inbjudningskoder för grundarkohort). Strategin är ett förstahandsförslag — exakt vilken region/nätverk som blir första kohort är fortfarande öppet.** |
| Google-inloggning är prioriterad som MVP i 4b, men bara magic link (Resend) är implementerat i nuvarande kod — ska Google-inloggning prioriteras innan lansering? | **Väntar (v2.6): Nedprioriterat för nu — hanteras senare, inte blockerande för övrigt arbete.** |
| §9 anger att Kanban i MVP ska vara utan tokenutdelning, men Tribe Tokens/GT (Utvecklingsfas 2.8) är redan fullt implementerat i koden — bör §9:s MVP-scope uppdateras för att spegla detta, eller bör tokenutdelningen stängas av tills övriga MVP-delar är klara? | **Löst (v2.6): §9 uppdaterat — Tribe Tokens & GT flyttat till "Inkluderat i MVP" för att spegla att det redan är byggt och i drift.** |
| Idéverkstaden (Utvecklingsfas 1.2 — kollaborativ trådbaserad idégenerering med `@AI`) saknar helt kodmässig grund, trots att det är en av de mest utförligt specificerade sektionerna i detta dokument — vilken prioritet ska den ges relativt övriga ofärdiga faser? | **Löst (v2.6): Hög prioritet — nästa gap att bygga.** |
| Granskningsrådet (Utvecklingsfas 2.97) saknar valprocess, ledamöter och uteslutningsmekanism i koden — flaggning av projekt/innehåll finns redan (Utvecklingsfas 2.97/5.76), men själva rådet gör det inte. Blockar detta lansering av crowdfunding och vinstdelning, som förutsätter en fungerande tvistlösningsinstans? | **Löst (v2.6): Ja, blockerande — crowdfunding och vinstdelning ska inte lanseras förrän Granskningsrådet finns på plats som tvistlösningsinstans. Hög prioritet att bygga.** |
| `legal_type` och hela ägarstrukturen i 4c saknar motsvarighet i databasschemat — bör detta byggas innan crowdfunding (Utvecklingsfas 3) eller vinstdelning (4a) går live, givet att fördelningslogiken i 4a förutsätter `legal_type`? | **Löst (v2.6): Ja, blockerande — `legal_type` måste finnas på plats innan crowdfunding/vinstdelning lanseras, eftersom 4a:s fördelningslogik förutsätter det.** |
| Projektchatt, diskussionsforum, videomöten och kalendersynkronisering (Utvecklingsfas 2.5) saknas helt i koden — enbart privata meddelanden (DM) och notifikationer är byggda (`kanaler`-rutten är bara en redirect-alias till DM-systemet, ingen egen kanalmodell). Räcker DM för lansering, eller krävs projektchatt/forum innan Utvecklingsfas 2.5 kan anses klar? | **Löst (v2.6): En riktig projektchattkanal (dedikerad kanalmodell, automatiskt skapad per projekt) krävs innan Utvecklingsfas 2.5 anses klar — dagens `kanaler`-redirect till DM-systemet räcker inte. Forum, videomöten och kalendersync kan vänta.** |
| Impact-fondens kapitalomfördelningsflöde (`impact_fund_ledger`, Utvecklingsfas 2.96) saknas i koden trots att impact-mätning redan finns — bör detta byggas i samma veva som vinstdelningslogiken i 4a, eftersom flödena är direkt beroende av varandra? | **Löst (v2.6): Ja — byggs tillsammans med vinstdelningslogiken i 4a som ett sammanhållet arbete.** |
| E2E-kryptering av privata meddelanden krävs uttryckligen i 5.30, men är inte implementerad i nuvarande DM-funktion — ska kravet mjukas upp, eller krävs det innan DM kan anses produktionsklar? | **Löst (v2.6): Kravet mjukat upp — 5.30 och 5.31 nedgraderar E2E från krav till möjlig framtida förbättring; kryptering i vila/transit (databas + TLS) räcker för nu.** |
| Idéflödets co-creation (versionshistorik, förslag à la pull request) och automatisk idé→projekt-pipeline (Utvecklingsfas 1.5) saknas i koden — redan noterat som "iteration 2" i §9, men bekräftat här som fortsatt öppet efter kodgranskning. | **Löst (v2.6): Prioritet höjd — flyttas upp bland de närmast liggande gapen, tidigare än §9:s ursprungliga "iteration 2"-placering.** |
| PWA/offline-stöd (5.75) saknas i koden — lägre prioritet, men noterat som gap mot Utvecklingsfas 5:s tillgänglighetskrav. | **Löst (v2.6): Låg prioritet bekräftad — byggs efter övriga högprioriterade gap.** |
| Gating-villkor `pilot` → `production` (se 4d) — vad krävs konkret för att en pilot ska räknas som redo för skarp drift? | **Föreslaget (v3.2): Tribe Token-röstning godkänner pilotresultatet + minst en milstolpe klar + `resources_secured` uppfyllt. Se 4d. Ej formellt beslutat av styrelsen.** |
| Gating-villkor `production` → `establish` (se 4d) — t.ex. ett minimiantal månaders stabil drift, eller ett annat mått? | **Föreslaget (v3.2): Projektpuls stabil över tröskelvärde N i N sammanhängande månader, utan öppet allvarligt Granskningsråds-ärende. Se 4d. Svagast underbyggt av de tre — kräver troligen styrelsediskussion, då "stabil verksamhet" ser olika ut per `legal_type` (se 4c).** |
| Gating-villkor `scale` → `impact` (se 4d) — vilka mätbara resultat krävs innan ett initiativ formellt räknas som i impact-fasen? | **Föreslaget (v3.2): Minst en fork har själv nått `establish` + verifierade SDG-resultat rapporterade via ny `impact_reports`-tabell. Se 4d. Ej formellt beslutat av styrelsen.** |
| Namnkonflikt mellan livscykelfaserna i 4d (`idea`...`impact`, var ett enskilt initiativ befinner sig) och den befintliga "Fas"-numreringen i §11 (Utvecklingsfas 1, 1.2, 2.8 osv, utvecklingsordning för plattformens funktioner) — bör ett av begreppen döpas om innan Claude Code implementerar, för att undvika sammanblandning i kod och kommunikation? | **Löst (v2.9): Plattformens utrullningsordning heter nu "Utvecklingsfas X" genomgående. Livscykelfaserna i 4d behåller ordet "fas" i löptext.** |
| `peer_review_approved` (se 4d, delsteg i `idea`-fasen) — är detta samma granskningsmekanism som Granskningsrådet (Utvecklingsfas 2.97), eller en separat, lättare community-granskning innan idé blir projekt? | **Löst (v3.0): Separat mekanism. Peer review är proaktiv kvalitetsgranskning av peers innan idé blir projekt. Granskningsrådet är reaktivt och hanterar anmälningar om regelbrott hos användare, projekt eller organisationer, med möjlighet till uteslutning. Se 4d för fullständig jämförelse.** |
| Fork-funktion (se 4f) — vem får initiera en dissens-fork? Krävs tidigare aktivt bidrag i originalprojektet? | **Beslutat (v3.5): Vem som helst, permissionless — inget krav på tidigare bidrag.** |
| Fork-funktion (se 4f) — vilken fas (4d) hamnar ett forkat projekt i? | **Beslutat (v3.7): Fork tillåts oavsett vilken fas originalprojektet befinner sig i (`idea` t.o.m. `impact`). Det forkade projektet ärver originalets fas vid gaffeltillfället, med egen fasövergångshistorik framåt.** |
| Fork-funktion (se 4f) — vilken `legal_type` (4c) får ett forkat projekt vid skapande om originalet var `commercial_umbrella` eller `commercial_ab`? | **Beslutat (v4.1): `nonprofit_umbrella` som default för alla forkar. Forken ärver aldrig originalets plats i ett paraply-AB eller dess eget aktiebolag — vill forken bli kommersiell krävs 4c:s vanliga övergångsprocess, ingen genväg.** |
| Självvald uppdelning (se 5.65, flyttad från 4f i v4.4 — se namnkollision löst) — vem äger organisationen som skapas? | **Beslutat (v3.5): Samma initiativtagare som originalprojektet.** |
| Gäller fork-funktionens kompensationsmodell (vinstandel, se 4f) även vid självvald uppdelning (5.65)? | **Löst (v4.4): Nej, ej längre relevant — självvald uppdelning är nu en egen mekanism under 5.65, skild från fork (4f). Eftersom det typiskt är samma team/initiativtagare på båda sidor av en uppdelning finns ingen naturlig "kompensation till original" att reglera. Se 4f/5.65 för den nya åtskillnaden.** |
| Planeringsverktyg i Sandbox (se Utvecklingsfas 1.2) — exakt vilka ytterligare ramverk (t.ex. Business Model Canvas, SWOT) ska ingå från start vs. läggas till senare? | Öppen |
| Tokens i Sandbox (se Utvecklingsfas 1.2) — exakt GT-belopp per bidrag, samt om utfallsbaserad mintning (vid lyft/fork) är rätt avvägning mot löpande GT för aktivt deltagande | **Föreslaget: utfallsbaserad mintning, för att undvika spam/farming i en medvetet lågtröskelzon. Ej slutgiltigt beslutat, se Sandbox.** |
| Fullföljdskravet för allmännyttig stiftelse (se 4c) — stämmer den planerade utdelningstakten i `impact_fund_ledger`/4a faktiskt överens med Skatteverkets krav på ca 75–80% över en rullande 5-årsperiod? | Öppen — kräver avstämning med jurist/revisor, ingen siffra verifierad |
| Fas- och stegwidgeten (se 4d) — riskerar den bli förvirrande i praktiken när fasövergångar är låsta men delsteg inom en fas är fritt valbara? Bör följas upp efter lansering med användartester. | Öppen — designbeslut fattat (guide, inte tvång), men UX-utfallet är overifierat |
| Sandbox (se Utvecklingsfas 1.2) — gäller Granskningsrådets reaktiva princip (5.54) fullt ut, eller behövs en lättare/snabbare moderering givet högre volym och mer experimentellt innehåll? | Öppen |

---

## 11. Plattformens resa — Översikt

```
Problem → [Utvecklingsfas 1.2] Idégenerering → [Utvecklingsfas 1.5] Öppen Innovation →
[Utvecklingsfas 1] Projektformering → [Utvecklingsfas 2] Community & Matchmaking →
[Utvecklingsfas 2.5] Socialt samarbete → [Utvecklingsfas 2.8] Tribe Tokens & GT →
[Utvecklingsfas 2.9] AI-agenter → [Utvecklingsfas 2.95] Demokrati & Röstning →
[Utvecklingsfas 2.96] Impact-fond & kapitalomfördelning →
[Utvecklingsfas 2.97] Granskningsråd, uteslutning & etisk granskning →
[Utvecklingsfas 3] Crowdfunding → [Utvecklingsfas 3.5] Extern Fondansökan (framtid) →
[Utvecklingsfas 4] Skalning & Global Etablering

Genomgående i alla faser:
[Utvecklingsfas 5] Mänsklig Grund — Onboarding, Mentorskap, Lärande,
        Välmående, Tillgänglighet, Etik
```

## 12. Nästa steg

*(Uppdaterad v4.11 — se ändringslogg. Kodbasen har redan byggt MVP:n och merparten av Utvecklingsfas 1–5; listan nedan är de gap som återstår, inte en startlista.)*

1. **Formalisera gating-villkoren i 4d** — de tre övergångarna `pilot`→`production`, `production`→`establish` och `scale`→`impact` är fortfarande bara "Föreslaget", inte styrelsebeslutade. Blockerar inget kodarbete i sig (gatingfunktionerna är byggda som ett konfigurerbart regelverk, se 4d), men bör beslutas innan projekt i praktiken börjar nå de faserna.
2. ~~Bygg `impact_reports`-tabellen~~ **Klart (v4.12)** — `ImpactReport`-modellen finns nu i schemat. Kvarstår: UI för att skapa och verifiera rapporter, samt att koppla den till den faktiska `scale`→`impact`-gatinglogiken när den beslutas (se punkt 1).
3. **Låt jurist granska avtalsmallarna** för kommersiella och ideella projekt (se 4c) samt gränsdragningen för tokensystemet (Utvecklingsfas 2.8) — fortfarande inte gjort.
4. **Proaktiv innehållsmoderering** — idag finns bara reaktiv flaggning (`ContentFlag`/Granskningsrådet); inget automatiskt spamskydd eller filter för olämpligt innehåll (se §10).
5. **Idéflödets co-creation** (Utvecklingsfas 1.5) — versionshistorik och pull request-liknande förslag på idéer, samt en automatisk idé→projekt-pipeline, är inte byggda trots att de är detaljerat specificerade.
6. **SSO/SAML-inloggning och upphandlingsvänliga funktioner** (fakturering, DPA, SLA) för offentlig sektor/akademia/företagskunder — obyggt, se §10.
7. **Följ upp fas- och stegwidgeten efter lansering** — designbeslutet (guide, inte tvång, se 4d) är fattat men UX-utfallet är overifierat med riktiga användare.
8. **Åtgärda de tre driftsgapen i produktion** (se "Known Issues" i CLAUDE.md): `REDIS_URL` saknas i `goodtribes-secret` (livechatt uppdateras inte live utan omladdning), Strapi delar fortfarande `public`-schemat med Prisma i produktion (måste separeras innan `chart/values.yaml` uppdateras, annars raderas produktionens Strapi-innehåll), och Stripe-nycklar saknas i produktion (crowdfunding kör bara manuellt pledge-läge, inga riktiga betalningar).

---

*Detta dokument är levande och uppdateras kontinuerligt.*
