# Testrapport: från drömruta till Idé-fas (2026-10-09)

En genomgång av hela flödet för en ny användare, lokalt på `fix/startsida-stiftelse` (main + startsidesfixar). Claude var både testanvändare och AI:n, via AI-reläet (`AI_PROVIDER=relay`). Omvärldsbevakningen byggde på riktiga webbsökningar.

**Testpersonen:** en ny användare utan namn (`inga.test@example.test`) som drömmer om "promenadkompisar för ensamma äldre i Hässelby". Hen skrev drömmen i rutan på startsidan, gick igenom Drömguiden både utloggad och inloggad, skapade projektet med AI, granskade Idé-sidan, öppnade tavlan, publicerade, loggade en intervju, sammanfattade intervjun och tog fram beslutsunderlaget vid fasgrinden. Allt testades också i mobilvy (375 px).

Fynden är ordnade efter hur mycket de spelar roll inför presentationen den 3 december.

---

## A. Måste åtgärdas före 3 december

### A1. 50 personer på samma wifi kan inte logga in
`frontend/src/auth.ts:22`: `MAGIC_LINK_IP_LIMIT = 10` per 10 minuter. Alla i lokalen har samma publika IP-adress, så efter 10 inloggningslänkar stoppas resten tyst. Det kom inte fram i testet, men det följer direkt av koden.
**Förslag:** höj gränsen (till exempel 100 per 10 minuter) eller gör den konfigurerbar via en miljövariabel. Gränsen per e-postadress (3 per 10 minuter) räcker som skydd.

### A2. Ett misslyckat AI-anrop lämnar ett halvfärdigt "Drömsamtal" efter sig
När AI-anropet vid "Skapa mitt projekt" misslyckades (Vertex-uppgifter saknades på den gamla dev-servern) visades "Något gick fel" och knappen "Skapa utan AI i stället". Det som är bra. Men i databasen låg en `DreamConversation` kvar med status `in_progress` och utan projekt. Från och med då visar `/projects/new` bannern "Du har ett påbörjat Drömsamtal: **fortsätt det**". Länken leder till den gamla chatten (`/projects/new/samtal/<id>`), som har en egen knapp "Skapa projektet nu". Bannern ligger kvar även efter att ett projekt skapats på annat sätt.
**Varför det är viktigt den 3 december:** tar AI-budgeten slut eller blir API:et långsamt får varje drabbad deltagare ett andra, gammalt flöde.
**Förslag:** i `createProjectFromGuide` (`projects/new/guide-actions.ts`), ta bort rummet och samtalet när steget efter misslyckas, eller kör allt i en transaktion. Visa inte bannern för samtal som startats från Drömguiden.

### A3. Användaren tillfrågas aldrig om sitt namn, så projektet blir anonymt
Den som loggar in via Drömguiden hamnar direkt tillbaka i guiden. `User.name` förblir NULL och `onboardingDone` false. Följden:
- teamet på projektsidan visas som **"?"**
- projektkortet i listan säger **"av Okänd"**
- användarmenyn visar e-postadressen

En besökare ser alltså inte vem som står bakom drömmen. Det är just det som får människor att vilja hjälpa till.
**Förslag:** fråga efter förnamn (och gärna en bild) på sammanfattningen i Drömguiden eller direkt efter inloggningen, innan projektet skapas.

### A4. Den bästa vägledningen ("Börja här") visas aldrig för en ny användare
`ide/page.tsx:258`: "Börja här" har Kritikerns viktigaste invändning, de tre gissningar idén vilar på ("Stämmer / Ändra / Vet inte") och intervjuerna. Den visas bara i vyn "allt" (`?view=all`). Efter "Skapa mitt projekt" hamnar användaren i stegvyn på Social Lean Canvas, och när fyllningen är klar hoppar sidan av sig själv till Målgruppsintervjuer. Både `/ide` och projektsidans "Fortsätt i Idé" leder dit. Testpersonen såg aldrig Kritikern eller gissningarna.
**Förslag:** låt "Börja här" vara första vyn efter att AI:n fyllt Idé-fasen, eller lägg den som "steg 0" före "Om projektet".

### A5. Idé-fasen ser nästan klar ut efter tre minuter, utan att användaren har gjort något
`lib/ideaFill.ts:419` (`markDone`) bockar av varje steg som AI:n fyllt, med användaren som `completedById`. Impactmodellen räknas dessutom som klar automatiskt. Efter fyllningen står det **"Idé 6/7"** i rubrikraden och "Idé — 6 av 7 klara" på projektsidan, också för besökare. Samtidigt ligger AI:ns sex kort i **Granskning** och väntar på godkännande, och grinden säger **"0 av 9 uppgifter klara"**. Två system visar alltså olika saker på samma sida.
Det går emot tanken med #200, där AI:ns arbete betalas och räknas först när en ledare har godkänt det, och mot att Idé-fasen ska hjälpa användaren att förtydliga sin dröm.
**Förslag:** bocka inte av steget i `markDone`. Låt `markStepDoneIfCardsDone` göra det när kortet hamnar i Klart. Visa i stället stegets status som "AI-utkast — granska". Det ger också ett naturligt nästa steg: "Granska AI:ns utkast (6)".

### A6. Projektsidan är tom ovanför vecket, särskilt på mobil
Den som skannar en QR-kod möter en stor tom bildplats ("P"), teamet som "?" och ett rutnät med 17 SDG-ikoner. Ingen text om drömmen syns innan man skrollar. Titeln har dessutom ett konstigt datum: "Promenadkompis Hässelby – 9/10-26".
**Förslag:** visa projektets sammanfattning (en mening finns redan, `summary`), vem som startat det och knappen "Jag vill hjälpa till" överst. Visa en genererad bild eller färgplatta i stället för "P" när bild saknas.

### A7. En delad projektlänk saknar bild, och beskrivningen klistras ihop
`projects/[slug]/page.tsx:82`: `og:description` är hela projekttexten med `stripHtml`, så styckena går ihop ("…sedan hennes man dog.Idén är enkel…"). Det finns ingen `og:image`, och `twitter:card` är `summary`. När någon delar sin dröm på Facebook, LinkedIn eller i sms syns ingen bild.
**Förslag:** använd `summary` som beskrivning och lägg till `opengraph-image.tsx` per projekt (titel, sammanfattning, SDG-färger, projektbilden om den finns).

---

## B. Fel och inkonsekvenser

| # | Var | Vad som händer | Förslag |
|---|---|---|---|
| B1 | `lib/dreamGuide.ts:49` (`SWEEPING`) | Långa, konkreta svar får följdfråga för att de innehåller "folk" eller "många" ("Jag känner **folk** i Hembygdsföreningen…", "…träffpunkt som **många** inte orkar…"). Utloggad får man alltid den fasta följdfrågan, som ibland frågar efter något svaret redan innehåller. Guidens egen fråga innehåller dessutom ordet "folk". | Kräv både kort svar *och* ett svepande ord, eller räkna bara svepande ord i svar under ~100 tecken. |
| B2 | `projects/new/guide-actions.ts:78` | Promptens följdfråga ser bara den aktuella frågan och svaret, inte drömmen. AI:n kan därför inte knyta an till Hässelby, äldre och så vidare. | Skicka med drömmen (svar 1) som sammanhang. |
| B3 | `lib/prompts/ideaFill.ts:42` | Projektbeskrivningen skrivs i tredje person: "**Initiativtagaren** har jobbat som undersköterska…". Det låter konstigt i en offentlig projekttext. | Be AI:n skriva i vi- eller jag-form, eller med initiativtagarens förnamn när det finns (se A3). |
| B4 | Idé-fyllningens prompter | Inget hindrar att tredje parts namn och ålder ("min granne Inga, 87") hamnar i en offentlig projekttext. I testet var det Claude som spelade AI:n och valde att utelämna namnet. En riktig modell kan lika gärna ta med det, eftersom prompten säger "med initiativtagarens egna ord". | Lägg till regeln: "Nämn aldrig privatpersoner vid namn i projekttexten." |
| B5 | `ide/StepDone.tsx:40` | Ett steg som är avbockat visar ändå knappen "✓ Klar" så länge stegets kort inte ligger i Klart. Det gör det oklart om steget är klart eller inte. | Försvinner med A5. Annars: visa "Klart — 1 uppgift väntar på granskning". |
| B6 | `lib/yourTribe.ts:39` | Ett projekt som skapades för fyra minuter sedan visas som **"står still"** i Att göra-panelen, eftersom det inte har några `ActivityEvent`. | Använd `Project.createdAt` som `lastAt` när inget annat finns. Projektskapandet bör också logga en händelse. |
| B7 | Fasgrinden (`ide?step=gate`) | Listan över kriterier saknar **Impactmodell**: 6 rader för 7 steg. | Lägg till den eller förklara varför den saknas. |
| B8 | Kortfönstret på tavlan | Status visas på engelska ("**REVIEW**"). "Ansvarig: — ingen —" fast kortet är tilldelat AI-användaren i databasen (AI-användaren finns inte i listan över medlemmar). Sparar man kortet kan AI:ns tilldelning försvinna och utbetalningen vid godkännande ändras. Fönstret har en vågrät rullningslist. | Översätt statusen. Ta med AI-användaren i ansvarig-listan. Rätta bredden. |
| B9 | Tavlan | Att klicka på ett kort gör ingenting. Kortet öppnas bara med en liten **"+"**-knapp, som ser ut som "lägg till" (`KanbanCardItem.tsx:231`). | Låt ett klick på kortet öppna det, och byt ikonen till en penna eller pil. |
| B10 | AI-korten i Granskning | Kortet "Fyll i Social Lean Canvas" har ingen beskrivning av vad AI:n gjorde, ingen länk till canvasen och ingen "Godkänn"-knapp. Man måste veta att kortet ska dras till Klart. | Ge AI-kort en länk till steget och knapparna "Godkänn" och "Be om ändring". |
| B11 | Öppna frågor från Drömguiden ("Vet inte än") | De blir kort utan `phase`/`stepKey` och hamnar under "Okategoriserat → Önskelista". De syns därför inte i något Idé-steg. | Tagga dem med `phase: IDEA` och det steg de hör till (till exempel `target_audience_interviews` för "Vilka ska använda…"). |
| B12 | Publicera | Ett klick publicerar direkt, utan bekräftelse och utan att visa vad som blir offentligt. Efteråt händer ingenting synligt: bannern försvinner, men man får varken en gratulation eller en uppmaning att dela. | Visa "Ditt projekt är publicerat 🎉" med Dela-knapp och QR-kod. Det är det bästa ögonblicket att dela (se A7). |
| B13 | Sidtitlar | "Promenadkompis Hässelby — Uppgifter — GoodTribes.org — **GoodTribes.org**": suffixet kommer två gånger på `/tasks` och `/interviews`. | Ta bort suffixet i sidans eget `title` eller i mallen. |
| B14 | Startsidan | Texten "Du väljer själv när drömmen **skall** delas med andra". Resten av sajten skriver "ska". | Ändra till "ska". |
| B15 | Intervjuformuläret | Datumfältet är tomt (borde vara dagens datum). Tom kryssruta "Problemet validerat" tolkas av AI:n som "initiativtagaren bedömde problemet som inte bekräftat", fast användaren bara inte tog ställning. | Förifyll datumet. Gör valet trevägs (ja / nej / vet inte) eller skicka inte en tom ruta som "nej". |

---

## C. Förbättringar av flödet (inga fel, men det skulle hjälpa användaren)

1. **Intervjuloopen är bra men splittrad.** "Logga intervju" leder till en separat sida, `/interviews`, utan intervjuguiden och utan antagandena. Efter att man sparat skickas man inte tillbaka. "Sammanfatta intervjuerna" ligger längst ner på Idé-sidan under hela guiden. **Förslag:** logga intervjun direkt i steget, med guidens frågor som stöd, och föreslå "Sammanfatta" när en intervju är sparad.
2. **"Låt AI:n föreslå intervjufrågor" visas fast en intervjuguide redan finns.** Dölj knappen eller döp om den till "Föreslå fler frågor".
3. **Projektsidan saknar ett "Nästa steg".** Översikten visar en länk "Fortsätt i Idé", ett diagram över Att göra och en tom kalender. **Förslag:** överst ett block med de 1–3 viktigaste sakerna just nu, till exempel "Granska AI:ns utkast (6)" och "Boka 3–5 intervjuer", med de kort från tavlan som hör till steget.
4. **Besökare ser interna verktyg** (Att göra-diagram, en tom kalender, Idé 6/7) men inte vad projektet behöver hjälp med. **Förslag:** visa i stället "Söker: …" (`neededSkills`) och vad man kan göra som ny medlem.
5. **AI-fyllningen hoppar mellan steg medan användaren läser.** Sidan bytte själv från `#lean-canvas` till `#intervjuer`. **Förslag:** stå kvar och visa en diskret "Klart — gå vidare →".

---

## D. Det som fungerade bra (behåll)

- **Drömrutan → Drömguiden:** drömmen följer med och fråga 1 hoppas över. "Vet inte än" blir öppna frågor och kort.
- **Svaren överlever inloggningen** via `localStorage`, och godkännandet av avtalen är tydligt.
- **AI-följdfrågan** fungerar, både när AI:n hittar en följdfråga och när den svarar `INGEN`.
- **Promptarna är genomtänkta:** inga påhittade fakta, märkningen VET/ANTAR, Kritikerns namnkontroll och omvärldsbevakningen som bara godtar källor från riktiga sökresultat.
- **Kritikern, gissningskorten, intervjusyntesen** (som visar "Smärtlindrare — motsagt" med länk till fältet) och **beslutsunderlaget vid fasgrinden** (som ärligt rekommenderar "Justera" utan intervjuer) håller hög kvalitet.
- **Mobilvyn** av startsidan, Drömguiden och Idé-stegen fungerar bra.

---

## Testmiljö och städning

- **Data i den lokala databasen:** testanvändaren `test-dromare-1` (`inga.test@example.test`), projektet `promenadkompis-hasselby` och ett kvarlämnat `DreamConversation` (från A2). Allt kan tas bort.
- **Dev-servern:** den gamla servern på port 3010 (startad av en annan session, konfigurerad för Vertex och med en Redis-adress som inte längre stämde) stoppades. En ny kör på port 3020 i reläläge, via konfigurationen `frontend-3020-relay`, som lades till i `.claude/launch.json`.
- **AI-reläets svar:** finns i sessionens scratchpad (`ai-relay/`).
