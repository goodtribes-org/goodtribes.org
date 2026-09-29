# Plan: AI-iteration och antaganden i Idéfasen

Beslutat med Niklas 2026-09-29. Bygger på den viktade AI-budgeten (`viktad-ai-budget.md`, PR #145), som gör billiga iterationsanrop säkra att erbjuda per block.

Mål: Idéfasen ska vara en loop, *antagande → test → lärdom → uppdatering*, där AI:n är sparringpartner genom hela fasen, inte bara skriver det första utkastet.

## PR A — "Förbättra" per block (implementerad, grenen `feat/block-iteration`)

- Varje block i Social Lean Canvas, Kundmodell, Värdeerbjudande och Impactmodell har en knapp, ✨ Förbättra, med fyra val:
  - **Skärp** (Haiku): gör texten konkret och sätter platshållare `[…]` där fakta saknas.
  - **Förenkla** (Haiku): samma innehåll med enklare ord.
  - **Utmana mig** (Haiku): högst 3 kritiska frågor. Texten ändras inte och ingenting sparas.
  - **Fråga mig** (Haiku för frågorna, Sonnet för förslaget): 2–3 frågor, användaren svarar, AI:n skriver ett förslag. Det är det enda valet som finns på ett tomt fält.
- Förslagen landar som `AiFieldSuggestion` i den befintliga rutan (Använd / Använd delar / Ignorera). AI:n skriver aldrig direkt i fältet.
- "Hitta aldrig på fakta" upprätthålls i kod: modellen listar namn den nämner (`names`), och förslag eller frågor med namn som inte finns i underlaget kastas (`lib/grounding.ts`, samma regel som Kritikern).
- Följer canvas-stegets AI-läge (inget i MANUAL, `feature: "canvas-review"`), budget per användare och den viktade projektbudgeten.
- Filer: `lib/prompts/blockIteration.ts`, `lib/blockIteration.ts` (ren logik, testad), `lib/actions/blockIteration.ts`, `components/ai/BlockIterateMenu.tsx` (+ `CanvasIterateProvider` på de fyra canvas-sidorna).

Kvar att verifiera: ett riktigt anrop mot Claude/Vertex (den lokala AI-nyckeln saknar kredit och Vertex-kvoten var inte beviljad 2026-09-29) och ett klickflöde i webbläsaren.

## PR B — Antaganden som ryggrad (byggd på grenen `feat/assumptions`, utkast-PR, MERGA INTE än)

**Merga först när produktionen driftsätter igen** (`curl https://goodtribes.org/api/health` visar ett `version`-fält) och den uppsamlade versionen är utrullad och kontrollerad. Merga den sedan ensam, eftersom den innehåller migrationen `20260929180000_assumptions`. Migrationen är rent additiv (tre enums och en tabell) och verifierad mot en tom Postgres med hela migrationskedjan.

Punkterna 1–6 nedan är byggda. Punkt 7 (konsekvenskontroll) är inte byggd.

I dag är ett "antagande" bara ett helt canvasfält med status ANTAR (`FieldProvenance`). Det räcker inte för att prioritera eller testa.

1. **Datamodell** (ny migration enligt shadow-DB-flödet i CLAUDE.md, aldrig `migrate dev`). Modellen `Assumption`:
   - `projectId`, `text`
   - källa `sourceEntity`/`sourceField` (valfri)
   - `risk` (HIGH/MEDIUM/LOW)
   - `status` (UNTESTED/TESTING/SUPPORTED/REFUTED)
   - `testPlan`, `evidence`
   - `origin` (USER/AI/CRITIQUE/INTERVIEW)
   - tidsstämplar och vem som ändrat
2. **Hitta antaganden** (Haiku, på begäran): AI:n föreslår 3–7 konkreta antaganden ur canvasen, med risk och ett billigt test var. Användaren väljer vilka antaganden som ska behållas. Inget sparas automatiskt.
3. **Kritikern → åtgärd:** varje kritikpunkt får knappen "Gör till antagande". Det ger punkterna ett liv efter att Kritikern körts om.
4. **Intervjusyntes → status:** bekräftade eller motbevisade verdikt föreslår statusändring på kopplade antaganden (föreslår, ändrar inte).
5. **Nästa steg-kort** på `/ide`, regelbaserat utan AI: det riskablaste otestade antagandet och dess test.
6. **Fasgrinden:** nytt rådgivande kriterium, "de mest riskabla antagandena är testade". Gate-briefen får antagandelistan som underlag.
7. **Konsekvenskontroll** (regelbaserad): när ett block ändras markeras kopplade antaganden och beroende block ("Kundsegment ändrat → se över Värdeerbjudande och Intervjuguide").
