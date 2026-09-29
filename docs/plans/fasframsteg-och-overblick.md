# Plan: Fasframsteg, AI-utkast att bekräfta och förklaringsrutor

Beslutat med Niklas 2026-09-29, efter en genomgång av IdeaBuddy (se konversationen). Punkterna 1–3 från jämförelsen. **Inga migrationer**, så allt kan mergas medan produktionen står still.

Mål: användaren ska alltid se hur långt projektet har kommit, vad som återstår och vad som är nästa steg. I dag finns faserna och grindarna, men inte känslan av att bli klar med något.

---

## Del 1 — Fasstaplar som fylls på (huvudpunkten) — BYGGD, PR C1 (`feat/phase-progress-bars`)

### Design (Niklas förslag, bilden i konversationen)
Sex kolumner: **stapel överst → numrerad cirkel + fasnamn**, i färgskalan från nya startsidan: gult → orange → rött → grönt (`PHASE_BARS` i `components/ny-startsida/Sections.tsx`: `#F5B82E #F29A2A #EE7A26 #E8531F #1FA37A #0F7A55`).

- **Stapeln fylls från vänster** med fasens färg i takt med att uppgifterna blir lösta. Resten av stapeln är en ljus ton av samma färg, så man ser hela stapelns längd.
- **Numret blir en bock (✓)** när fasen är klar.
- **Fasen man står i** får fetstil och en tunn ring runt cirkeln. Kommande faser är dämpade men läsbara.
- **Klick på en fas** öppnar samma meny som i dag: fasens översikt, guiden och checklistan med bockar.
- **Under staplarna, en rad:** "Nästa steg: *Genomför 3 målgruppsintervjuer* →". Det är den första olösta uppgiften i den fas man står i, med en länk dit. Motsvarar IdeaBuddys "Getting started".
- **På mobil:** två rader med tre faser, eller en horisontellt skrollbar rad. Beslutas vid bygget; det ska fungera ner till 360 px.

### Var den visas
- **Projektsidan och guidesidorna:** ersätter dagens `PhaseMenuBar` där den används (`projects/[slug]/page.tsx` och `guide/*`).
- **Nytt, i en kompakt variant:** överst på alla fasöversikter (`/ide`, `/uppstart`, `/lansering`, `/etablera`, `/skala`, `/impactfasen`). Staplarna är tunnare och utan meny, bara framsteg och nästa steg. Då ser man framstegen där arbetet faktiskt görs.
- **Färgerna:** `PHASE_COLORS` i `lib/projectPhase.ts` (blått → rött) byts mot den nya skalan, så att en fas har samma färg överallt, även i `PhaseChecklistWidget`. En separat konstant för startsidan behövs inte längre, och den nya skalan flyttas till `lib/projectPhase.ts`.

### Vad som fyller staplarna: automatiskt när det går
I dag bygger framsteg bara på manuella bockar (`InitiativeChecklistItem`). "När uppgifterna blir lösta" bör betyda **det som faktiskt är gjort**, inte bara det som bockats.

Ny ren funktion `lib/phaseProgress.ts`: `taskDone(key, signals, manualKeys) → boolean`. En uppgift räknas som klar om **den är manuellt bockad ELLER om en automatisk signal visar att den är gjord**. Bocken finns kvar för det som inte går att mäta, och för den som vill markera något i förväg. Signalerna hämtas i en serverfunktion `getProjectSignals(projectId)` (ett fåtal `count`-frågor, cachade per förfrågan).

**Första omgången, Idé och Uppstart:**

| Uppgift | Automatisk signal |
|---|---|
| `dream_defined` Beskriv projektet | Drömsamtalet bekräftat, eller sammanfattning och beskrivning ifyllda |
| `ai_reviewed` Välj SDG | `sdgGoals` inte tom |
| `peer_feedback_requested` Bygg teamet | minst 2 medlemmar eller en skickad inbjudan |
| `lean_canvas_created` | minst 6 av 11 block ifyllda |
| `value_proposition_created` | minst 4 fält ifyllda |
| `target_audience_interviews` | minst 3 loggade intervjuer (samma som fasgrinden, `MIN_INTERVIEWS`) |
| `market_scan_partners` | minst 1 post i marknadsskanningen |
| `core_team_formed` | minst 2 medlemmar med roll |
| `kanban_seeded` | minst 3 kanbankort |
| `sprint_prepped` + delsteg | sprint skapad; delstegen följer sprintens steg om det finns data, annars manuellt |
| `rough_budget_estimated` | `estimatedFundingNeed` satt |

Senare faser har kvar manuella bockar tills vidare. Signaler för dem läggs till fas för fas (pilotkriterier, impactmått, partnerskap och så vidare), med samma mönster.

**Antaganden (PR #147):** när #147 är mergad räknas "De riskablaste antagandena testade" in i Idé-stapeln med regeln `riskyAssumptionsTested`. Tills dess ingår den inte, så att den här PR:en inte beror på #147.

**Fasgrinden oförändrad:** framsteg är överblick, aldrig ett lås. En fas kan vara 60 % klar och ändå gå vidare, precis som grinden redan är rådgivande.

---

## Del 2 — "Det här är AI-utkast som behöver er blick"

Vi fyller i allt direkt, som IdeaBuddy, men vi **märker** vad som är AI-utkast. Den styrkan ska synas.

- **Överst på `/ide`** (och motsvarande översikter), en rad: "**5 av 13 fält är AI-utkast** som ingen i teamet har gått igenom än. Visa dem →". Siffran räknas ur `FieldProvenance`: fält med innehåll där `author = AI`.
- **"Visa dem"** markerar de fälten i canvas och värdeerbjudande med en tunn kant och ett litet märke, och skrollar till det första.
- **En ny knapp per AI-fält, "Ser bra ut":** fältet räknas som genomgånget utan att någon behöver skriva om det.
  - **Val utan migration:** knappen sätter `author` till `AI_EDITED`. Kommentaren på enumen ändras till "ett AI-utkast som en människa har tagit ansvar för, redigerat eller godkänt".
  - **VET/ANTAR är oberoende:** att godkänna ett utkast betyder inte att innehållet är *bekräftat*. Det förblir ANTAR tills någon vet.
- **Att redigera ett fält** räknas redan som genomgånget, via befintlig `markAiSuggestionPartlyUsed` och `recordHumanEdits`, som bör sätta `AI_EDITED`. Det ska kontrolleras vid bygget.

---

## Del 3 — Förklaringsrutor per sektion

IdeaBuddy har en kort ruta per sektion ("Välkommen till …", vad man gör och ett tips) som går att stänga.

- **Ny komponent `SectionIntro`:** titel, 2–3 meningar och ett tips. Den stängs med ✕ och hålls stängd per besökare i `localStorage`, inlindat i try/catch enligt samma mönster som `AiModeSettings` intro. Via "?" i sektionens rubrik kan man öppna den igen.
- **Används på:**
  - Idé-översiktens sektioner: Kritikern, Antaganden, Canvas, Impactmodell, Värdeerbjudande, Omvärld, Intervjuer och Fasgrind.
  - Canvas-sidorna: Social Lean Canvas, Kundmodell, Värdeerbjudande och Impactmodell.
- **Texter:** i `messages/sv.json` och `messages/en.json`, namnrymd `SectionIntro`. De skrivs för en ideell initiativtagare, inte för en startup ("vilka vill ni hjälpa", inte "vilka är era kunder"). Det ska inte vara en upprepning av `WorkspacePageHeader`s hjälpknapp; den finns kvar för den som vill läsa mer.
- **Rundtur per fas:** valfri och senare. `SpotlightTour` finns redan (OrgTourGate, VolunteerTourGate), och en "Visa mig runt i Idéfasen" kan byggas på den. Den ingår inte i första PR:en.

---

## Uppdelning i PR:er
1. **PR C1 — Fasstaplar + automatiska signaler (Idé och Uppstart) + nästa steg.** Störst värde och syns överallt.
2. **PR C2 — AI-utkast att gå igenom** (räknare, markering och "Ser bra ut").
3. **PR C3 — Förklaringsrutor per sektion.**

Alla tre är rent gränssnitt och läsning. Inga migrationer, och de kan mergas oberoende av #147.

## Validering
Enligt CLAUDE.md: `tsc`, lint och `npm test`. Enhetstester för `taskDone` och för signalerna, med signalerna som ren logik. Webbläsarkontroll på localhost:3010, i desktop- och mobilbredd, med ljust och mörkt tema, för ett projekt i Idé och ett i Impact.

## Beslut (Niklas, 2026-09-29)
- **Synlighet:** staplarna syns för alla besökare. "Nästa steg" visas bara för projektmedlemmar, och bockarna för dem som får redigera.
- **Färger:** den nya skalan gäller överallt (`PHASE_COLORS`). Checklist-widgetens rubriktext är mörk, eftersom gult och orange inte går att läsa som text på vitt.

## Kvar efter C1
- **Guidesidorna** (`IdeaGuide` och `PhaseGuide`) visar fortfarande bara manuella bockar i sina egna steglistor. Fasmenyn ovanför dem visar automatiskt klara steg. De bör få `autoDoneKeys` på samma sätt.
