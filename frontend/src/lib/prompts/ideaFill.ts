// Prompts for the AI filling in the Idé phase after Drömsamtalet (see
// lib/ideaFill.ts). Each section is its own small call so the overview page
// can show them appearing one by one, and so one failing section doesn't
// take the others down. Kept in their own file so they can be edited
// without touching code.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från samtalet och det som redan står om projektet. Hitta ALDRIG på fakta: inga siffror, statistik, namn på organisationer eller personer som inte nämnts.
- Lämna hellre ett fält tomt än att gissa.
- För varje fält: basis = "user" om initiativtagaren själv sa det, "inferred" om du härlett eller föreslagit det.
- Skriv kort och konkret, med initiativtagarens egna ord så långt det går.`;

const field = (description: string) => ({
  type: "object" as const,
  description,
  properties: {
    value: { type: "string" },
    basis: { type: "string", enum: ["user", "inferred"] },
  },
  required: ["value", "basis"],
});

// ─── Om projektet ───────────────────────────────────────────────────────────

export const BASICS_SYSTEM_PROMPT = `Du har just haft ett kort Drömsamtal med en initiativtagare på GoodTribes.org. Ta fram grunden för projektet: namn, beskrivning, kategori, globala mål och förutsättningar.

${SHARED_RULES}
- Föreslå högst 3 av FN:s globala mål (1–17), bara de som tydligt passar.
- Kategori måste vara en av: Technology, Environment, Education, Arts, Community, Health, Other.
- Öppna frågor: det initiativtagaren inte visste, och det som behöver undersökas.

Svara genom verktyget "projektgrund".`;

export const BASICS_TOOL = {
  name: "projektgrund",
  description: "Projektets grund utifrån samtalet.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: field("Ett kort, beskrivande projektnamn."),
      summary: field("En mening som beskriver projektet."),
      description: field("Två till fyra stycken om projektet: drömmen, problemet, idén och vilka som behövs."),
      category: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      sdg_goals: { type: "array", items: { type: "integer" } },
      weekly_hours: { type: ["integer", "null"] },
      team_mode: { type: ["string", "null"], enum: ["SOLO", "SMALL", "TEAM", null] },
      ambition: { type: ["string", "null"], enum: ["HOBBY", "VENTURE", null] },
      open_questions: { type: "array", items: { type: "string" } },
    },
    required: ["title", "summary", "description", "open_questions"],
  },
};

// ─── Lean Canvas ────────────────────────────────────────────────────────────

export const LEAN_CANVAS_SYSTEM_PROMPT = `Fyll i en Social Lean Canvas (socialleancanvas.com) för ett socialt projekt på GoodTribes.org utifrån Drömsamtalet och projektbeskrivningen. Canvasen håller ihop tre modeller: kundmodellen (kundsegment, jobs to be done, värdeerbjudande, lösning), impactmodellen (syfte och impact) och den ekonomiska modellen (kanaler, intäkter, kostnader). Det är ett första utkast som initiativtagaren granskar; allt du härleder märks som ett antagande.

${SHARED_RULES}
- Fält som kräver siffror du inte fått (t.ex. kostnader eller nyckeltal) formuleras som vad som behöver tas reda på, inte som påhittade belopp.

Svara genom verktyget "lean_canvas".`;

export const LEAN_CANVAS_TOOL = {
  name: "lean_canvas",
  description: "Social Lean Canvas-fält.",
  input_schema: {
    type: "object" as const,
    properties: {
      purpose: field("Syftet: varför projektet finns, den förändring det vill se i världen."),
      impact: field("Förändringsteorin: hur det projektet gör leder till mätbar impact, via deltagare och aktiviteter till utfall."),
      customerSegments: field("Kunderna: vilka som betalar, och vilka som använder eller gynnas om det inte är samma."),
      jobsToBeDone: field("Vad kunderna försöker få gjort: behov och problem de vill lösa."),
      uniqueValueProposition: field("Varför kunderna väljer detta: löftet i en tydlig mening."),
      solution: field("Lösningen i korthet: produkten eller tjänsten."),
      channels: field("Hur man når kunderna och levererar värdet."),
      revenueStreams: field("Varifrån pengarna kan komma: försäljning, bidrag, crowdfunding, sponsring."),
      costStructure: field("Vad det kostar att driva, i stora drag."),
      unfairAdvantage: field("Fördelen: vad initiativtagaren har som är svårt att kopiera, t.ex. erfarenhet, nätverk, förtroende."),
      keyMetrics: field("Några få mått som visar att det fungerar, både för impact och ekonomi."),
    },
  },
};

// ─── Impactmodell ───────────────────────────────────────────────────────────

export const IMPACT_MODEL_SYSTEM_PROMPT = `Fyll i en impactmodell (Social Lean Canvas, socialleancanvas.com) för ett socialt projekt på GoodTribes.org. Impactmodellen är projektets förändringsteori: en kedja från problemet projektet tar sig an, via deltagare och aktiviteter, till utfall på kort, medellång och lång sikt. Kedjan slutar i canvasens Impact-ruta, som redan finns och inte ska fyllas i här. Varje steg ska leda logiskt till nästa. Det är ett första utkast som initiativtagaren granskar.

${SHARED_RULES}
- Utfall beskriver förändring hos människor eller i samhället, inte vad projektet producerar. "30 städdagar" är en aktivitet, "elever vet var plasten kommer ifrån" är ett utfall.
- Lova inga siffror eller effekter som inte nämnts. Skriv hellre vad som behöver mätas.

Svara genom verktyget "impactmodell".`;

export const IMPACT_MODEL_TOOL = {
  name: "impactmodell",
  description: "Impactmodellens steg.",
  input_schema: {
    type: "object" as const,
    properties: {
      issue: field("Problemet: samhällsproblemet projektet tar sig an."),
      participants: field("Deltagarna: vilka som är med, t.ex. målgrupper, volontärer och partner."),
      activities: field("Aktiviteterna: vad projektet gör tillsammans med deltagarna."),
      shortTermOutcomes: field("Kortsiktiga utfall: direkta förändringar i kunskap, attityder eller färdigheter."),
      mediumTermOutcomes: field("Medellånga utfall: förändrat beteende och nya vanor."),
      longTermOutcomes: field("Långsiktiga utfall: bestående förändring i människors liv eller villkor."),
    },
  },
};

// ─── Värdeerbjudande ────────────────────────────────────────────────────────

export const VALUE_PROPOSITION_SYSTEM_PROMPT = `Fyll i en värdeerbjudande-canvas (kundprofil och värdekarta) för ett socialt projekt på GoodTribes.org utifrån Drömsamtalet och projektbeskrivningen. Utgå från den primära målgruppen. Det är ett första utkast som initiativtagaren granskar.

${SHARED_RULES}

Svara genom verktyget "vardeerbjudande".`;

export const VALUE_PROPOSITION_TOOL = {
  name: "vardeerbjudande",
  description: "Värdeerbjudande-fält.",
  input_schema: {
    type: "object" as const,
    properties: {
      vpJobs: field("Kundens uppgifter: vad målgruppen försöker åstadkomma."),
      vpPains: field("Smärtor: vad som hindrar eller besvärar dem idag."),
      vpGains: field("Vinster: vad de önskar sig."),
      vpProducts: field("Produkter och tjänster projektet erbjuder."),
      vpRelievers: field("Hur erbjudandet lindrar smärtorna."),
      vpCreators: field("Hur erbjudandet skapar vinsterna."),
    },
  },
};

// ─── Omvärldsbevakning (with web search) ────────────────────────────────────

export const MARKET_SCAN_SYSTEM_PROMPT = `Gör en första omvärldsbevakning för ett socialt projekt på GoodTribes.org. Gör högst tre webbsökningar efter befintliga aktörer, initiativ och alternativ som redan arbetar med samma problem eller målgrupp, främst i Sverige, samt relevanta trender eller regler.

Regler:
- Ta bara med sådant du faktiskt hittat i sökresultaten, och ange alltid adressen (source_url) till sidan du hittade det på. Inga påhittade organisationer.
- Hellre 3 säkra träffar än 8 osäkra. Högst 8.
- type: COMPETITOR (liknande aktör eller alternativ), PARTNER_PROSPECT (möjlig samarbetspartner), TREND eller REGULATION.
- description: vad aktören gör, en till två meningar. relevance: varför det spelar roll för just det här projektet.

När du är klar med sökningarna: rapportera genom verktyget "omvarld".`;

export const MARKET_SCAN_TOOL = {
  name: "omvarld",
  description: "Rapportera vad omvärldsbevakningen hittade, med källor.",
  input_schema: {
    type: "object" as const,
    properties: {
      entries: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["COMPETITOR", "PARTNER_PROSPECT", "TREND", "REGULATION"] },
            name: { type: "string" },
            description: { type: "string" },
            relevance: { type: "string" },
            source_url: { type: "string" },
          },
          required: ["type", "name", "description", "source_url"],
        },
      },
    },
    required: ["entries"],
  },
};

// ─── Intervjuguide ──────────────────────────────────────────────────────────

export const INTERVIEW_GUIDE_SYSTEM_PROMPT = `Skriv en intervjuguide för målgruppsintervjuer i ett socialt projekt på GoodTribes.org. Syftet är att ta reda på om problemet är verkligt och hur det upplevs — inte att sälja idén.

Regler:
- 8–12 öppna frågor om personens egna erfarenheter ("Berätta om senast…", "Hur gör du idag när…"). Inga ledande frågor och inga frågor om vad de skulle tycka om lösningen.
- Utgå från projektets riskablaste antaganden om problemet och målgruppen.
- Några korta tips om hur man genomför intervjun och vad man ska anteckna.
- Kort och praktiskt.

Svara genom verktyget "intervjuguide".`;

export const INTERVIEW_GUIDE_TOOL = {
  name: "intervjuguide",
  description: "Intervjuguide för målgruppsintervjuer.",
  input_schema: {
    type: "object" as const,
    properties: {
      purpose: { type: "string", description: "Vad intervjuerna ska ta reda på, en eller två meningar." },
      who: { type: "string", description: "Vilka man bör intervjua, och hur man kan hitta dem." },
      questions: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 12 },
      tips: { type: "array", items: { type: "string" }, maxItems: 6 },
    },
    required: ["purpose", "who", "questions"],
  },
};
