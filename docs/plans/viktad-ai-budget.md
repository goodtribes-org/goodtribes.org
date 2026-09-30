# Plan: Viktad AI-budget per projekt (PR 1 av Idéfas-iterationen)

Status: implementerad 2026-09-29 på grenen `feat/weighted-ai-budget` (steg 1–6 och 8). Steg 7 (kalibrering) återstår — standardvärdet är $2 tills vidare. Nästa PR efter denna: iteration per block + antaganden som ryggrad i Idéfasen.

## Problem

Projektbudgeten (`checkAiProjectBudget` i `frontend/src/lib/anthropic.ts`, 60 per 30 dagar) räknar **gate-anrop**, inte kostnad:

- Ett billigt Haiku-anrop ("skärp det här blocket") kostar lika mycket budget som allt annat → iteration i Idéfasen skulle tömma kvoten snabbt.
- Tvärtom: `runIdeaFill` (`lib/ideaFill.ts:389`) och `runPhaseFill` (`lib/phaseFill.ts:144`) hämtar **en** gate och gör sedan många `messages.create` (flera sektioner, webbsökning) — hela Idé-fyllningen räknas som **1**. Det dyraste i appen syns nästan inte i budgeten.

## Lösning i korthet

Mät den faktiska kostnaden för varje `messages.create` utifrån `response.usage` och modell, och dra den från projektets budget. Gaten kontrollerar bara att det finns budget kvar innan anropet.

## Steg

1. **`frontend/src/lib/aiCost.ts`** (ny, ren logik)
   - Pristabell per modellfamilj (Haiku / Sonnet / Opus / Fable), i mikrodollar per token, Anthropics listpriser. Okänd modell → Opus-pris (hellre överskatta).
   - `costMicroUsd(model, usage)`: `input_tokens`, `output_tokens`, `cache_creation_input_tokens` (×1,25), `cache_read_input_tokens` (×0,1), `server_tool_use.web_search_requests` ($10 / 1000).
   - Vertex har egen prissättning; listpriset används som *relativ* vikt, inte som exakt faktura. Skriv det i kommentaren.

2. **Budgetlagring i Redis** (`lib/anthropic.ts`)
   - Nyckel `ai:spend:project:<id>` (mikrodollar, heltal), fast 30-dagarsfönster som i dag: `INCRBY` + `EXPIRE` vid första skrivningen.
   - `getAiProjectSpend(projectId)` (GET), `recordAiProjectSpend(projectId, micro)` (INCRBY).
   - `aiProjectMonthlyBudgetMicroUsd()` från env `AI_PROJECT_MONTHLY_BUDGET_USD` (standardvärde bestäms i steg 7).
   - Fail-open vid Redis-fel, samma 250 ms-timeout som `checkRateLimit`.

3. **Mätning i klienten** (`lib/aiMode.ts`)
   - Ny wrapper `withSpendMetering(client, projectId, feature)`, samma `Object.create`-mönster som `withLanguageClient` / `withVertexModelIds`: kör `create`, läs `usage`, anropa `recordAiProjectSpend` (fire-and-forget) och logga `{ feature, projectId, model, costMicroUsd }` via `logger.info`.
   - Läggs på i `getAiClientFor`, även när `projectId` är null (bara loggning, ingen budget). Då syns även sandbox-seed och idéflödet i loggarna.
   - Bara icke-streamade `messages.create` används i dag (verifierat), så inget stream-stöd behövs. Lägg en kommentar om det.

4. **Gaten** (`getAiClientFor`)
   - Ersätt `checkAiProjectBudget(projectId)` med `spend < budget` → annars `budget_exceeded` (samma orsak och samma UI-texter som i dag, inga ändringar hos anroparna).
   - Behåll det gamla antalsbaserade taket som **skydd mot skenande loopar**, men höj det till exempel till 500 per 30 dagar.
   - Överskridande: ett pågående anrop eller en fyllning som startats med budget kvar får slutföras (kostnaden dras efteråt). Dokumentera att budgeten kan överskridas med högst en körning.

5. **Synlig budget**
   - `getAiProjectBudgetStatus(projectId)` → `{ usedPct, remainingPct, resetsAt }`.
   - Visa den på AI-inställningarna (`edit/page.tsx` och `guide/page.tsx`, där `getProjectAiSettings` redan används): "AI-kvot: 38 % använt denna period, fylls på 28 okt". Visa procent, inte dollar. Nya nycklar i `messages/sv.json` och `messages/en.json`.
   - Varning i UI:t vid över 80 %.

6. **Tester**
   - `aiCost.test.ts`: prisberäkning, cache-viktning, webbsökning, okänd modell.
   - `aiMode.test.ts`: uppdatera testet för `budget_exceeded` (rad 138) till kostnadsmodellen; wrappern debiterar rätt projekt; gaten blockerar när `spend >= budget`; fail-open vid Redis-fel.
   - `aiGate.test.ts` ska fortsatt vara grön (ingen ny import av `createAnthropicClient`).

7. **Kalibrering av standardvärdet**
   - Kör Drömsamtal + Idé-fyllning + några iterationer lokalt, läs kostnaden från loggarna.
   - Sätt `AI_PROJECT_MONTHLY_BUDGET_USD` så att det ungefär motsvarar dagens 60-anropsgräns för ett typiskt flöde, plus utrymme för cirka 50 Haiku-iterationer. Rimlig startgissning: $1,50–$3 per projekt och månad. Beslutas utifrån mätningen, inte gissningen.

8. **Dokumentation**: uppdatera CLAUDE.md (AI-leverantörsavsnittet), kommentaren vid `aiProjectMonthlyLimit`, och `chart/values.yaml` om den nya env-variabeln.

## Validering
Enligt CLAUDE.md: `npx tsc --noEmit`, `npm test`, lint, `docker compose build frontend`, därefter PR och gröna Actions.

## Medvetet utanför scope
- En databastabell med historik per anrop (`AiUsage`). Loggarna räcker tills vidare; lägg till om site-admin behöver en översikt.
- En budget per användare i kostnad. Kvar: 10 anrop per timme, vilket duger som skydd mot missbruk.
- Byte av modell på befintliga anropsställen (gjordes i `7b7531a4`).
