# Plan: Export och delning av projektunderlag

Beslutad inriktning med Niklas 2026-09-29, efter jämförelsen med IdeaBuddy: deras export (PDF/Word/Excel och delningslänk) är en av de saker vi saknar helt. För våra användare är den extra viktig, eftersom bidragsansökningar, möten med kommunen och föreningsstämmor kräver dokument.

**Mål:** med ett klick få ett snyggt, ärligt **projektunderlag** att bifoga, skriva ut eller skicka, och en länk att dela med mentorer och finansiärer.

---

## Val av teknik (rekommendation)

| Alternativ | För | Emot | Beslut |
|---|---|---|---|
| **Utskriftsanpassad sida + webbläsarens "Spara som PDF"** | Inga nya beroenden, fungerar i produktionsbilden som den är, riktig text (sökbar och kopierbar), samma i18n och komponenter som sajten | Användaren gör ett klick till i utskriftsdialogen | ✅ **E1** |
| `@react-pdf/renderer` (PDF på servern) | En riktig "Ladda ner PDF"-knapp | All layout måste byggas en gång till i ett eget format, och typsnitt och svenska tecken ska bäddas in | Senare, om knappen efterfrågas |
| Headless Chromium på servern | Pixelperfekt | Ungefär 300 MB större bild och mycket minne i klustret, där resursbrist redan gav ett utfall (2026-08-23) | ❌ Nej |
| `docx` (ren JS, .docx-fil) | Finansiärers formulär vill ofta ha text att kopiera in, och Word är standard | Egen, enklare layout | ✅ **E2** |

## E1 — Exportsida + "Spara som PDF" + dela länk (ingen migration)

**Route:** `/projects/[slug]/export`. Den ligger utanför workspace-layouten, så att navigeringen inte syns på papper. Utskrifts-CSS används (`@page` A4, sidbrytningar per avsnitt). Canvasen får ett eget liggande A4-blad.

**Innehåll ("Projektunderlag")**, i den här ordningen. Varje avsnitt kan bockas av eller på innan man skriver ut:
1. **Försättsblad:** titel, slogan, kort sammanfattning, fas, SDG-ikoner, antal i teamet, datum och "Underlag från GoodTribes.org" med en länk.
2. **Om projektet:** beskrivningen, rensad med `sanitizeHtml()` precis som på sajten.
3. **Social Lean Canvas:** rutnätet. **Licensraden CC BY-SA 3.0 måste följa med**, eftersom det är ett krav i licensen.
4. **Kundmodell:** tidiga användare och alternativ.
5. **Impactmodell:** kedjan från problem till Impact. Märkt som *"teamets plan, inte ett resultat"*, samma regel som i appen.
6. **Värdeerbjudande.**
7. **Antaganden och vad vi har testat.** Kommer när #147 är mergad: riskablaste först, med status och evidens. Visar ärligt vad som är bekräftat och vad som fortfarande är antaganden, och det är en styrka inför en finansiär.
8. **Vad intervjuerna visade:** antal intervjuer och lärdomarna från syntesen. **Inga personnamn eller persona-namn** (integritet); bara sammanfattade lärdomar.
9. **Omvärld:** marknadsskanningens poster **med källor**.
10. **Verifierad impact:** endast verifierade rapporter, samma regler som `VerifiedImpactPanel`. Levererad effekt och mottaget stöd visas i olika avsnitt, siffrorna visas som de rapporterats, och **ingenting summeras**. Kvalificeringar som "minst" och "ungefär" följer med.
11. **Finansieringsbehov** (`estimatedFundingNeedSek`), om det är ifyllt.

**Vet/Antar-märkning:** en liten märkning per fält *"Antagande"* eller *"Bekräftat"* visas som standard. Det är ärligt mot mottagaren och en av GoodTribes styrkor. Den går att stänga av med en kryssruta.

**Förval (knappar överst):** "Bidragsansökan" (allt), "Mentor/coach" (canvas, impactmodell, antaganden, intervjuer) och "Kort presentation" (försättsblad, canvas och impact). De ställer bara in kryssrutorna.

**Innan export, om det finns ogranskade AI-utkast:** en rad med *"5 fält är AI-utkast som ingen i teamet gått igenom. Vill ni se över dem först?"* och en länk. Det kopplar till #149. Exporten stoppas inte.

**Dela länk:** knappen "Kopiera länk" för **offentliga** projekt, eftersom projektet och canvas-sidorna redan är publika. För projekt som inte är offentliga (dolda eller i sandlådan) döljs knappen med en förklaring, och det blir E3.

**Ingångar:** knappen "Exportera / dela" på projektsidan (för medlemmar), på Idé-översikten och på canvas-sidorna.

**Integritet och säkerhet:** exporten visar bara det som redan är publikt för projektet. Inga e-postadresser, inga interna kommentarer, inga personnamn från intervjuer och ingen AI-kostnad. Den offentliga sidans behörighet (dolda projekt ger 404 för icke-medlemmar) gäller även exporten.

## E2 — Word (.docx) för ansökningsformulär (ingen migration)
- **"Ladda ner som Word":** samma avsnitt och samma kryssrutor, byggt med `docx` på servern (route handler). Enkel layout med rubriker, stycken och tabeller för canvasen.
- **"Kopiera text" per avsnitt** på exportsidan, för att klistra in i en funders webbformulär.

## E3 — Privata delningslänkar (kräver migration, vänta tills produktionen driftsätter)
- **Datamodell:** `ProjectShareLink`, med token (slumpad och oförutsägbar), sektioner, `expiresAt`, `revokedAt`, skapad av, och antal visningar.
- **Användning:** för dolda projekt och sandlådeprojekt, och för att dela en ögonblicksbild med utvalda avsnitt.
- **Styrning:** projektledningen kan lista och återkalla länkar.
- **Migration:** enligt shadow-DB-flödet i CLAUDE.md. Mergas separat, på samma sätt som #147.

## Validering
- Enligt CLAUDE.md: `tsc`, lint och `npm test`.
- **Nytt Playwright-test:** öppnar exportsidan för ett projekt och kör `page.pdf()`. Det fångar krascher och tomma avsnitt i CI. Playwright finns redan.
- **Webbläsarkontroll:** förhandsvisning av utskrift i A4 stående och liggande (canvasen), svenska och engelska, samt ett projekt i Idé och ett i Impact.

## Öppna frågor till Niklas
1. **Vet/Antar-märkningen på som standard** i exporten? Förslag: ja, för ärlighet mot finansiärer.
2. **Behövs Word (E2)**, eller räcker PDF plus "Kopiera text" till en början?
3. **Ska exporten följa projektets språk** (`contentLocale`) **eller besökarens?** Förslag: projektets, eftersom en svensk ansökan ska vara på svenska även om den som klickar har engelska inställt.
