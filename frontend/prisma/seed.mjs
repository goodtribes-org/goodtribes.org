// Dev-only seed script — populates the local database with realistic sample
// content reflecting what GoodTribes.org actually is (Swedish volunteers +
// impact-driven organisations, SDG-aligned projects). Not run automatically
// anywhere; invoke manually with `node prisma/seed.mjs` against a local dev
// DATABASE_URL. Safe to re-run — it clears its own previously-seeded rows
// (by email) before inserting fresh ones.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_EMAILS = [
  "elin@example.com", "marcus@example.com", "sara@example.com", "johan@example.com",
  "nadia@example.com", "oskar@example.com", "fatima@example.com", "erik@example.com",
  "linnea@example.com", "amir@example.com",
];

async function main() {
  console.log("Rensar tidigare seed-data...");
  await prisma.user.deleteMany({ where: { email: { in: SEED_EMAILS } } });
  await prisma.skill.deleteMany({ where: { slug: { in: [
    "projektledning", "fundraising", "grafisk-design", "ux-design", "webbutveckling",
    "juridik", "marknadsforing", "data-science", "kommunikation", "ekonomi",
    "agila-metoder", "sociala-medier", "textproduktion", "fotografi", "react",
  ] } } });

  console.log("Skapar kompetenser...");
  const skillDefs = [
    { name: "Projektledning", tag: "ledarskap", slug: "projektledning", description: "Planera, driva och följa upp projekt från idé till leverans." },
    { name: "Fundraising", tag: "ekonomi", slug: "fundraising", description: "Finansiering, bidragsansökningar och givarrelationer." },
    { name: "Grafisk design", tag: "kreativt", slug: "grafisk-design", description: "Visuell identitet, layout och kommunikationsmaterial." },
    { name: "UX-design", tag: "tech", slug: "ux-design", description: "Användarupplevelse och gränssnittsdesign." },
    { name: "Webbutveckling", tag: "tech", slug: "webbutveckling", description: "Frontend- och backend-utveckling för webb." },
    { name: "Juridik", tag: "juridik", slug: "juridik", description: "Föreningsrätt, avtal och GDPR för ideell sektor." },
    { name: "Marknadsföring", tag: "kommunikation", slug: "marknadsforing", description: "Kampanjer, varumärke och räckvidd." },
    { name: "Data science", tag: "tech", slug: "data-science", description: "Dataanalys och mätning av impact." },
    { name: "Kommunikation", tag: "kommunikation", slug: "kommunikation", description: "Extern och intern kommunikation." },
    { name: "Ekonomi", tag: "ekonomi", slug: "ekonomi", description: "Budget, redovisning och rapportering." },
    { name: "Agila metoder", tag: "ledarskap", slug: "agila-metoder", description: "Scrum, Kanban och iterativt arbetssätt." },
    { name: "Sociala medier", tag: "kommunikation", slug: "sociala-medier", description: "Innehåll och community på sociala plattformar." },
    { name: "Textproduktion", tag: "kreativt", slug: "textproduktion", description: "Copywriting och redaktionellt innehåll." },
    { name: "Fotografi", tag: "kreativt", slug: "fotografi", description: "Bilddokumentation av projekt och events." },
  ];
  const skills = {};
  for (const s of skillDefs) {
    skills[s.slug] = await prisma.skill.create({ data: s });
  }

  console.log("Skapar användare...");
  const u = {};
  u.elin = await prisma.user.create({ data: {
    name: "Elin Björk", email: "elin@example.com", showProfile: true, siteRole: "OWNER",
    bio: "Grundare av GoodTribes. Brinner för att koppla ihop volontärer med organisationer som gör skillnad.",
    availability: "5-10 tim/vecka", country: "Sverige",
  } });
  u.marcus = await prisma.user.create({ data: {
    name: "Marcus Lindqvist", email: "marcus@example.com", showProfile: true, siteRole: "ADMIN",
    bio: "Fullstackutvecklare med fokus på klimatteknik.", availability: "3-5 tim/vecka", country: "Sverige",
  } });
  u.sara = await prisma.user.create({ data: {
    name: "Sara Al-Amin", email: "sara@example.com", showProfile: true,
    bio: "UX-designer som vill göra ideellt engagemang enklare för alla.", availability: "2-4 tim/vecka", country: "Sverige",
  } });
  u.johan = await prisma.user.create({ data: {
    name: "Johan Petersson", email: "johan@example.com", showProfile: true,
    bio: "Jurist med inriktning på föreningsrätt och GDPR.", availability: "1-2 tim/vecka", country: "Sverige",
  } });
  u.nadia = await prisma.user.create({ data: {
    name: "Nadia Karlsson", email: "nadia@example.com", showProfile: true,
    bio: "Marknadsförare som hjälper ideella organisationer att synas.", availability: "3-5 tim/vecka", country: "Sverige",
  } });
  u.oskar = await prisma.user.create({ data: {
    name: "Oskar Nyström", email: "oskar@example.com", showProfile: true,
    bio: "Dataanalytiker som gillar att mäta impact på riktigt.", availability: "2-3 tim/vecka", country: "Sverige",
  } });
  u.fatima = await prisma.user.create({ data: {
    name: "Fatima Hussein", email: "fatima@example.com", showProfile: true,
    bio: "Kommunikatör och skribent med hjärtat i civilsamhället.", availability: "3-4 tim/vecka", country: "Sverige",
  } });
  u.erik = await prisma.user.create({ data: {
    name: "Erik Holm", email: "erik@example.com", showProfile: true,
    bio: "Ekonom med erfarenhet av bidragsansökningar och budgetar.", availability: "2-4 tim/vecka", country: "Sverige",
  } });
  u.linnea = await prisma.user.create({ data: {
    name: "Linnea Ström", email: "linnea@example.com", showProfile: true,
    bio: "Projektledare inom civilsamhället i över tio år.", availability: "5-8 tim/vecka", country: "Sverige",
  } });
  u.amir = await prisma.user.create({ data: {
    name: "Amir Hassan", email: "amir@example.com", showProfile: true,
    bio: "Fotograf som dokumenterar volontärinsatser runt om i landet.", availability: "1-3 tim/vecka", country: "Sverige",
  } });

  console.log("Kopplar kompetenser till användare...");
  const userSkills = [
    [u.elin, ["projektledning", "fundraising"]],
    [u.marcus, ["webbutveckling", "data-science"]],
    [u.sara, ["ux-design", "grafisk-design"]],
    [u.johan, ["juridik"]],
    [u.nadia, ["marknadsforing", "sociala-medier"]],
    [u.oskar, ["data-science"]],
    [u.fatima, ["kommunikation", "textproduktion"]],
    [u.erik, ["ekonomi", "fundraising"]],
    [u.linnea, ["projektledning", "agila-metoder"]],
    [u.amir, ["fotografi"]],
  ];
  for (const [user, slugs] of userSkills) {
    for (const slug of slugs) {
      await prisma.userSkill.create({ data: { userId: user.id, skillId: skills[slug].id } });
    }
  }

  console.log("Skapar organisationer...");
  const orgDefs = [
    { key: "natur", name: "Naturskyddsföreningen Lokal", slug: "naturskyddsforeningen-lokal", category: "Miljö", owner: u.elin, verified: true,
      description: "Lokal avdelning som arbetar för biologisk mångfald, ren natur och opinionsbildning i närområdet." },
    { key: "roda", name: "Röda Korset Ungdom", slug: "roda-korset-ungdom", category: "Socialt", owner: u.linnea, verified: true,
      description: "Ungdomsrörelsen inom Röda Korset som stöttar unga i utsatta livssituationer runt om i Sverige." },
    { key: "klimat", name: "Klimatkollektivet", slug: "klimatkollektivet", category: "Klimat", owner: u.marcus, verified: false,
      description: "Gräsrotsrörelse som driver på för en snabbare och rättvis klimatomställning lokalt." },
    { key: "digital", name: "Digitalt Utanförskap", slug: "digitalt-utanforskap", category: "Digital inkludering", owner: u.sara, verified: false,
      description: "Arbetar för att fler — oavsett ålder eller bakgrund — ska få tillgång till digital kompetens." },
    { key: "matsvinn", name: "Matsvinn Sverige", slug: "matsvinn-sverige", category: "Matsvinn", owner: u.erik, verified: true,
      description: "Sprider kunskap och bygger digitala verktyg för att halvera matsvinnet i svenska hushåll och butiker." },
  ];
  const orgs = {};
  for (const o of orgDefs) {
    orgs[o.key] = await prisma.organisation.create({ data: {
      name: o.name, slug: o.slug, category: o.category, description: o.description,
      ownerId: o.owner.id, isPublic: true, verified: o.verified,
    } });
  }

  await prisma.organisationMember.createMany({ data: [
    { organisationId: orgs.natur.id, userId: u.amir.id, role: "MEMBER" },
    { organisationId: orgs.roda.id, userId: u.fatima.id, role: "MEMBER" },
    { organisationId: orgs.matsvinn.id, userId: u.nadia.id, role: "ADMIN" },
  ] });

  await prisma.organisationSkill.createMany({ data: [
    { organisationId: orgs.natur.id, skillId: skills["fotografi"].id },
    { organisationId: orgs.digital.id, skillId: skills["ux-design"].id },
    { organisationId: orgs.matsvinn.id, skillId: skills["webbutveckling"].id },
    { organisationId: orgs.roda.id, skillId: skills["kommunikation"].id },
  ] });

  await prisma.organisationReview.createMany({ data: [
    { organisationId: orgs.natur.id, authorId: u.sara.id, rating: 5, comment: "Superorganiserat och tydligt vad man ger sig in på. Rekommenderas!" },
    { organisationId: orgs.matsvinn.id, authorId: u.johan.id, rating: 4, comment: "Engagerat team, hade önskat lite tydligare onboarding." },
  ] });

  console.log("Skapar projekt...");
  const projectDefs = [
    { key: "renkust", slug: "ren-kust", title: "Ren Kust", org: orgs.natur, owner: u.elin, status: "PRODUCTION",
      sdgGoals: [14, 15], tags: ["miljö", "strandstädning", "volontär"],
      summary: "Regelbundna strandstädningar längs svenska kuster, organiserade av lokala volontärgrupper.",
      description: "Ren Kust samlar volontärer för återkommande strandstädningar längs den svenska kusten. Vi kartlägger nedskräpade områden, organiserar städdagar och rapporterar mängd och typ av skräp till Naturskyddsföreningens nationella statistik." },
    { key: "matsvinnapp", slug: "matsvinn-appen", title: "Matsvinn-appen", org: orgs.matsvinn, owner: u.erik, status: "PROTOTYPE",
      sdgGoals: [12], tags: ["app", "matsvinn", "webbutveckling"],
      summary: "En app som kopplar ihop butiker med osåld mat med hushåll och organisationer i närheten.",
      description: "Matsvinn-appen låter livsmedelsbutiker lägga upp mat som annars skulle slängas, så att privatpersoner och organisationer kan hämta den innan den går till spillo. Prototypen testas just nu i tre butiker i Göteborg." },
    { key: "digitalvag", slug: "digital-vagledning", title: "Digital Vägledning för Nyanlända", org: orgs.digital, owner: u.sara, status: "CONCEPT",
      sdgGoals: [10, 4], tags: ["digital inkludering", "utbildning"],
      summary: "Enkla, illustrerade guider som hjälper nyanlända navigera svenska myndigheters digitala tjänster.",
      description: "Många digitala myndighetstjänster i Sverige förutsätter en digital vana som nyanlända sällan hunnit bygga upp. Projektet tar fram bildbaserade, flerspråkiga guider tillsammans med språkcaféer runt om i landet." },
    { key: "kladbytardagen", slug: "kladbytardagen", title: "Klädbytardagen", org: orgs.klimat, owner: u.marcus, status: "DELIVERY",
      sdgGoals: [12], tags: ["cirkulär ekonomi", "event"],
      summary: "Återkommande klädbytardagar som minskar konsumtion och stärker lokal gemenskap.",
      description: "Klädbytardagen arrangerar återkommande bytesevent där deltagare tar med kläder de inte längre använder och byter till sig något nytt. Konceptet har spridit sig till åtta orter under det senaste året." },
    { key: "ungdomsjouren", slug: "ungdomsjouren-online", title: "Ungdomsjouren Online", org: orgs.roda, owner: u.linnea, status: "PRODUCTION",
      sdgGoals: [3], tags: ["stödverksamhet", "ungdomar"],
      summary: "Ett digitalt stödchat bemannat av utbildade volontärer för unga som mår dåligt.",
      description: "Ungdomsjouren Online erbjuder ett tryggt digitalt rum där unga kan chatta anonymt med utbildade volontärer om allt från ensamhet till psykisk ohälsa. Volontärer genomgår en obligatorisk utbildning innan de bemannar chatten." },
    { key: "solceller", slug: "solceller-for-skolor", title: "Solceller för Skolor", org: null, owner: u.oskar, status: "CONCEPT",
      sdgGoals: [7, 4], tags: ["förnybar energi", "utbildning"],
      summary: "Finansieringsmodell och pedagogiskt material för att sätta solceller på skoltak.",
      description: "Idén är att kombinera lokal crowdfunding med ett pedagogiskt paket, så att skolor både får solceller på taket och undervisningsmaterial om förnybar energi kopplat till den egna anläggningen." },
    { key: "mentorskap", slug: "mentorskap-ensamkommande", title: "Mentorskap för Ensamkommande", org: orgs.roda, owner: u.linnea, status: "PROTOTYPE",
      sdgGoals: [4, 10], tags: ["mentorskap", "integration"],
      summary: "Matchar ensamkommande ungdomar med vuxna mentorer för studie- och yrkesvägledning.",
      description: "Projektet matchar ensamkommande ungdomar 16–20 år med vuxna volontärmentorer för regelbundna träffar kring studier, yrkesval och att bygga nätverk i sin nya hemort." },
    { key: "oppendata", slug: "oppen-data-klimat", title: "Öppen Data för Klimatinitiativ", org: null, owner: u.marcus, status: "ARCHIVED",
      sdgGoals: [13, 17], tags: ["data", "klimat", "öppen källkod"],
      summary: "Ett öppet dataset över svenska klimatinitiativ, avslutat efter att data flyttades till Naturvårdsverket.",
      description: "Projektet byggde och underhöll en öppen databas över lokala klimatinitiativ i Sverige. Efter två framgångsrika år togs datasetet över av Naturvårdsverket och projektet avslutades formellt." },
    { key: "skrapplockar", slug: "skrapplockar-appen", title: "Skräpplockar-appen", org: null, owner: u.nadia, status: "DELIVERY",
      sdgGoals: [11, 15], tags: ["app", "skräpplockning", "gamification"],
      summary: "En app som gamifierar skräpplockning i stadsmiljö med poäng och lokala topplistor.",
      description: "Skräpplockar-appen låter användare fotografera och logga skräp de plockar upp i sin stad, samlar poäng och tävlar mot andra stadsdelar. Appen har nu över 4 000 registrerade användare." },
  ];
  const projects = {};
  for (const p of projectDefs) {
    projects[p.key] = await prisma.project.create({ data: {
      slug: p.slug, title: p.title, summary: p.summary, description: p.description,
      status: p.status, visibility: "public", tags: p.tags, sdgGoals: p.sdgGoals,
      ownerId: p.owner.id, orgId: p.org?.id ?? null,
    } });
    await prisma.projectMember.create({ data: { projectId: projects[p.key].id, userId: p.owner.id, role: "FOUNDER" } });
  }

  await prisma.projectMember.createMany({ data: [
    { projectId: projects.renkust.id, userId: u.amir.id, role: "MEMBER" },
    { projectId: projects.renkust.id, userId: u.fatima.id, role: "MEMBER" },
    { projectId: projects.matsvinnapp.id, userId: u.marcus.id, role: "ADMIN" },
    { projectId: projects.matsvinnapp.id, userId: u.sara.id, role: "MEMBER" },
    { projectId: projects.ungdomsjouren.id, userId: u.johan.id, role: "MEMBER" },
    { projectId: projects.kladbytardagen.id, userId: u.nadia.id, role: "MEMBER" },
  ] });

  await prisma.projectSkill.createMany({ data: [
    { projectId: projects.matsvinnapp.id, skillId: skills["webbutveckling"].id },
    { projectId: projects.matsvinnapp.id, skillId: skills["ux-design"].id },
    { projectId: projects.digitalvag.id, skillId: skills["grafisk-design"].id },
    { projectId: projects.solceller.id, skillId: skills["fundraising"].id },
    { projectId: projects.skrapplockar.id, skillId: skills["webbutveckling"].id },
  ] });

  console.log("Skapar wiki-sidor...");
  const wikiPages = {};
  wikiPages.renkustIntro = await prisma.wikiPage.create({ data: {
    projectSlug: projects.renkust.slug, slug: "kom-igang", title: "Kom igång som strandstädare", order: 0,
    content: "Välkommen till Ren Kust!\n\nHär hittar du allt du behöver veta för att delta i en strandstädning:\n\n- Ta med handskar och egen vattenflaska\n- Vi tillhandahåller sopsäckar och griptänger\n- Anmäl dig via kalendern minst 2 dagar innan\n\nVi ses på stranden!",
    createdById: u.elin.id,
  } });
  wikiPages.renkustSakerhet = await prisma.wikiPage.create({ data: {
    projectSlug: projects.renkust.slug, slug: "sakerhetsrutiner", title: "Säkerhetsrutiner", order: 1,
    content: "Säkerhet först:\n\n- Använd alltid handskar vid skräpplockning\n- Rapportera farligt avfall (kemikalier, vassa föremål) till platsansvarig — plocka inte upp det själv\n- Vid olycka, ring 112 och kontakta projektledaren direkt efteråt",
    createdById: u.elin.id,
  } });
  wikiPages.matsvinnArkitektur = await prisma.wikiPage.create({ data: {
    projectSlug: projects.matsvinnapp.slug, slug: "teknisk-arkitektur", title: "Teknisk arkitektur", order: 0,
    content: "Appen är byggd med:\n\n- React Native för mobilklienten\n- Node.js/Express för API:et\n- PostgreSQL för lagring av butiksinventarier\n\nSe repo-länken i projektfilerna för mer detaljer.",
    createdById: u.marcus.id,
  } });

  console.log("Skapar projektuppdateringar och milstolpar...");
  await prisma.blogPost.createMany({ data: [
    { projectSlug: projects.renkust.slug, authorId: u.elin.id, title: "150 kilo skräp borta från Sandvikens strand", body: "I helgen samlades 22 volontärer och plockade totalt 150 kilo skräp längs Sandvikens strand. Stort tack till alla som var med!" },
    { projectSlug: projects.matsvinnapp.slug, authorId: u.marcus.id, title: "Prototypen live i tre butiker", body: "Vi har nu testkört appen i tre butiker i Göteborg i två veckor. Över 80 kilo mat har räddats undan matsvinn hittills." },
    { projectSlug: projects.ungdomsjouren.slug, authorId: u.linnea.id, title: "20 nya volontärer utbildade", body: "Vår senaste utbildningsomgång är avklarad — 20 nya volontärer är nu redo att bemanna chatten." },
  ] });

  await prisma.milestone.createMany({ data: [
    { projectId: projects.renkust.id, title: "Genomför 10 strandstädningar", description: "Nå tio genomförda städdagar under året.", status: "in_progress", createdById: u.elin.id },
    { projectId: projects.matsvinnapp.id, title: "Lansera i 10 butiker", description: "Utöka prototypen från 3 till 10 butiker.", status: "pending", createdById: u.marcus.id },
    { projectId: projects.kladbytardagen.id, title: "Nå 10 orter", description: "Klädbytardagen arrangerad på minst tio orter.", status: "done", createdById: u.marcus.id },
  ] });

  console.log("Skapar idéer...");
  const ideaDefs = [
    { key: "secondhand", title: "Karta över second-hand-butiker", author: u.nadia,
      problem: "Det är svårt att hitta second-hand-butiker och bytesmarknader i sin egen stad.",
      solution: "En crowdsourcad karta där användare kan lägga till och betygsätta second-hand-ställen.",
      sdgGoals: [12], tags: ["cirkulär ekonomi", "karta"] },
    { key: "verktygslada", title: "Digital verktygslåda för lokala föreningar", author: u.sara,
      problem: "Små ideella föreningar saknar ofta enkla digitala verktyg för medlemshantering och ekonomi.",
      solution: "En samlad, gratis verktygslåda med mallar för medlemsregister, budget och stadgar.",
      sdgGoals: [17], tags: ["föreningsliv", "verktyg"] },
    { key: "klimatbudget", title: "Klimatbudget för hushåll", author: u.oskar,
      problem: "Många vill minska sitt klimatavtryck men vet inte var de ska börja.",
      solution: "En enkel app som räknar hushållets klimatavtryck och föreslår konkreta åtgärder rankade efter effekt.",
      sdgGoals: [13], tags: ["klimat", "app"] },
    { key: "mentorsnatverk", title: "Mentorsnätverk för unga entreprenörer", author: u.linnea,
      problem: "Unga med samhällsdrivna affärsidéer saknar ofta tillgång till erfarna mentorer.",
      solution: "Ett strukturerat mentorsprogram som matchar unga entreprenörer med erfarna volontärer från näringslivet.",
      sdgGoals: [8, 4], tags: ["entreprenörskap", "mentorskap"] },
  ];
  const ideas = {};
  for (const i of ideaDefs) {
    ideas[i.key] = await prisma.idea.create({ data: {
      title: i.title, problem: i.problem, solution: i.solution, sdgGoals: i.sdgGoals, tags: i.tags,
      authorId: i.author.id, status: "open",
    } });
  }
  await prisma.ideaVote.createMany({ data: [
    { ideaId: ideas.secondhand.id, userId: u.elin.id }, { ideaId: ideas.secondhand.id, userId: u.marcus.id },
    { ideaId: ideas.klimatbudget.id, userId: u.sara.id }, { ideaId: ideas.klimatbudget.id, userId: u.erik.id },
    { ideaId: ideas.verktygslada.id, userId: u.johan.id },
  ] });
  await prisma.ideaEndorsement.createMany({ data: [
    { ideaId: ideas.klimatbudget.id, userId: u.marcus.id },
    { ideaId: ideas.mentorsnatverk.id, userId: u.fatima.id },
  ] });
  await prisma.ideaComment.createMany({ data: [
    { ideaId: ideas.secondhand.id, authorId: u.johan.id, content: "Bra idé! Skulle vara najs med filter per stad." },
    { ideaId: ideas.klimatbudget.id, authorId: u.sara.id, content: "Skulle gärna testa detta som volontär om ni behöver UX-hjälp." },
  ] });

  console.log("Skapar academy-guider...");
  const guideDefs = [
    { title: "Kom igång som volontär", category: "Community", difficulty: "beginner", readTimeMinutes: 4, author: u.elin,
      body: "# Kom igång som volontär\n\nSå här hittar du ett projekt att engagera dig i på GoodTribes:\n\n1. Bläddra bland projekt via **Utforska**\n2. Filtrera på kompetens eller SDG-mål\n3. Skicka en förfrågan om att gå med\n\nDe flesta projekt svarar inom några dagar." },
    { title: "Så skriver du en bra projektansökan", category: "Crowdfunding", difficulty: "beginner", readTimeMinutes: 6, author: u.erik,
      body: "# Så skriver du en bra projektansökan\n\nEn stark ansökan svarar tydligt på:\n\n- Vilket problem löser ni?\n- Varför är just er lösning rätt just nu?\n- Hur mäter ni effekt?\n\nKonkreta siffror slår vaga visioner varje gång." },
    { title: "Grunderna i projektledning", category: "Projektledning", difficulty: "beginner", readTimeMinutes: 8, author: u.linnea,
      body: "# Grunderna i projektledning\n\nAtt driva ett ideellt projekt handlar mest om tydlighet:\n\n- Definiera mål och delmål\n- Håll korta, regelbundna avstämningar\n- Fira framsteg, även små" },
    { title: "Att engagera volontärer långsiktigt", category: "Community", difficulty: "avancerad", readTimeMinutes: 7, author: u.fatima,
      body: "# Att engagera volontärer långsiktigt\n\nVolontärer stannar när de känner:\n\n- Att deras tid gör skillnad\n- Att de utvecklas\n- Att de är en del av en gemenskap\n\nRegelbunden, ärlig återkoppling är den enskilt viktigaste faktorn." },
    { title: "GDPR för ideella föreningar", category: "Teknik", difficulty: "avancerad", readTimeMinutes: 9, author: u.johan,
      body: "# GDPR för ideella föreningar\n\nÄven små föreningar hanterar personuppgifter — medlemsregister, volontärlistor, bilder.\n\n- Ha ett register över vilka uppgifter ni hanterar och varför\n- Samla in samtycke innan ni publicerar bilder\n- Radera uppgifter ni inte längre behöver" },
  ];
  const guides = {};
  for (const g of guideDefs) {
    guides[g.title] = await prisma.academyGuide.create({ data: {
      title: g.title, bodyMarkdown: g.body, category: g.category, difficulty: g.difficulty,
      readTimeMinutes: g.readTimeMinutes, authorId: g.author.id, published: true,
    } });
  }
  await prisma.userGuideCompletion.createMany({ data: [
    { userId: u.sara.id, guideId: guides["Kom igång som volontär"].id },
    { userId: u.oskar.id, guideId: guides["Kom igång som volontär"].id },
    { userId: u.nadia.id, guideId: guides["Så skriver du en bra projektansökan"].id },
  ] });

  console.log("Skapar drömväggsinlägg...");
  const dreamTexts = [
    "Att varje strand i Sverige ska vara skräpfri om tio år.",
    "En värld där ingen mat slängs bara för att den är 'ful'.",
    "Att alla nyanlända ska känna sig hemma inom sitt första år.",
    "Solceller på varje skoltak i landet.",
    "Att ensamhet bland unga ska vara ett minne blott.",
    "Ett samhälle där ideellt engagemang värderas lika högt som lönearbete.",
  ];
  const dreamUsers = [u.elin, u.marcus, u.sara, u.fatima, u.oskar, u.linnea];
  const dreamPosts = [];
  for (let i = 0; i < dreamTexts.length; i++) {
    dreamPosts.push(await prisma.dreamWallPost.create({ data: { userId: dreamUsers[i].id, dreamText: dreamTexts[i] } }));
  }
  await prisma.dreamWallReaction.createMany({ data: [
    { dreamWallPostId: dreamPosts[0].id, userId: u.marcus.id, emoji: "🌊" },
    { dreamWallPostId: dreamPosts[0].id, userId: u.sara.id, emoji: "🙌" },
    { dreamWallPostId: dreamPosts[1].id, userId: u.erik.id, emoji: "🍎" },
  ] });

  console.log("Skapar feed-inlägg samt gillningar/kommentarer...");
  const feedPosts = [];
  feedPosts.push(await prisma.feedPost.create({ data: { authorId: u.elin.id, body: "Vilken helg! Tre projekt hade aktiviteter samtidigt — strandstädning, klädbyte och en volontärutbildning. Det här är varför GoodTribes finns. 💚" } }));
  feedPosts.push(await prisma.feedPost.create({ data: { authorId: u.nadia.id, body: "Skräpplockar-appen passerade 4000 registrerade användare i veckan! Stort tack till alla tidiga testare." } }));
  feedPosts.push(await prisma.feedPost.create({ data: { authorId: u.johan.id, body: "Skrev precis klart en GDPR-guide för ideella föreningar — länk i Academy för den som är nyfiken." } }));

  // Exercise the new like/comment/flag/share system across a few content types.
  await prisma.feedLike.createMany({ data: [
    { userId: u.marcus.id, targetType: "feedPost", targetId: feedPosts[0].id },
    { userId: u.sara.id, targetType: "feedPost", targetId: feedPosts[0].id },
    { userId: u.elin.id, targetType: "feedPost", targetId: feedPosts[1].id },
    { userId: u.fatima.id, targetType: "organisation", targetId: orgs.natur.id },
    { userId: u.oskar.id, targetType: "organisation", targetId: orgs.natur.id },
    { userId: u.marcus.id, targetType: "academyGuide", targetId: guides["GDPR för ideella föreningar"].id },
    { userId: u.elin.id, targetType: "project", targetId: projects.renkust.id },
  ] });
  await prisma.feedComment.createMany({ data: [
    { authorId: u.fatima.id, targetType: "feedPost", targetId: feedPosts[0].id, body: "Så fint att läsa! 🙌" },
    { authorId: u.sara.id, targetType: "organisation", targetId: orgs.natur.id, body: "Var med på strandstädningen i somras, superbra organiserat!" },
    { authorId: u.erik.id, targetType: "academyGuide", targetId: guides["GDPR för ideella föreningar"].id, body: "Tack Johan, väldigt konkret och lätt att följa." },
    { authorId: u.marcus.id, targetType: "wikiPage", targetId: wikiPages.renkustSakerhet.id, body: "Bra att ni la till punkten om farligt avfall, hände en incident förra året." },
  ] });

  console.log("Klart!");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
