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
  "klara@example.com", "viktor@example.com", "maja@example.com", "rasoul@example.com",
  "ingrid@example.com", "noor@example.com", "casper@example.com", "yasmin@example.com",
];

async function main() {
  console.log("Rensar tidigare seed-data...");
  // Milestone.createdBy / ActivityEvent.user / ImpactUpdate.updatedBy / AcademyGuide.author /
  // WikiPage.createdBy reference User directly without ON DELETE CASCADE, so they must be
  // cleared explicitly — otherwise Postgres blocks the user delete even though their parent
  // row (project/org/guide) would otherwise cascade them away in the same statement.
  const existingSeedUsers = await prisma.user.findMany({ where: { email: { in: SEED_EMAILS } }, select: { id: true } });
  const existingSeedUserIds = existingSeedUsers.map((r) => r.id);
  if (existingSeedUserIds.length > 0) {
    await prisma.milestone.deleteMany({ where: { createdById: { in: existingSeedUserIds } } });
    await prisma.activityEvent.deleteMany({ where: { userId: { in: existingSeedUserIds } } });
    await prisma.impactUpdate.deleteMany({ where: { updatedById: { in: existingSeedUserIds } } });
    await prisma.academyGuide.deleteMany({ where: { authorId: { in: existingSeedUserIds } } });
    await prisma.wikiPage.deleteMany({ where: { createdById: { in: existingSeedUserIds } } });
  }
  await prisma.user.deleteMany({ where: { email: { in: SEED_EMAILS } } });
  await prisma.skill.deleteMany({ where: { slug: { in: [
    "projektledning", "fundraising", "grafisk-design", "ux-design", "webbutveckling",
    "juridik", "marknadsforing", "data-science", "kommunikation", "ekonomi",
    "agila-metoder", "sociala-medier", "textproduktion", "fotografi", "react",
    "affarsutveckling", "forsaljning", "produktledning",
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
    { name: "Affärsutveckling", tag: "ekonomi", slug: "affarsutveckling", description: "Identifiera och utveckla nya intäktsmöjligheter och partnerskap." },
    { name: "Försäljning", tag: "kommunikation", slug: "forsaljning", description: "Bygga kundrelationer och driva intäkter genom hela säljcykeln." },
    { name: "Produktledning", tag: "tech", slug: "produktledning", description: "Prioritera, definiera och driva en produkt från idé till lansering." },
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
  u.klara = await prisma.user.create({ data: {
    name: "Klara Sundberg", email: "klara@example.com", showProfile: true,
    bio: "Serieentreprenör som startat tre sociala företag — nu rådgivare åt andra som vill kombinera vinst och samhällsnytta.",
    availability: "4-6 tim/vecka", country: "Sverige",
  } });
  u.viktor = await prisma.user.create({ data: {
    name: "Viktor Ahl", email: "viktor@example.com", showProfile: true,
    bio: "Produktchef på ett SaaS-bolag, bygger digitala produkter på fritiden för ideell sektor.",
    availability: "2-3 tim/vecka", country: "Sverige",
  } });
  u.maja = await prisma.user.create({ data: {
    name: "Maja Lindgren", email: "maja@example.com", showProfile: true,
    bio: "Pensionerad lärare som nu lägger sin tid på volontärarbete och mentorskap.",
    availability: "6-10 tim/vecka", country: "Sverige",
  } });
  u.rasoul = await prisma.user.create({ data: {
    name: "Rasoul Amiri", email: "rasoul@example.com", showProfile: true,
    bio: "Civilingenjör inom förnybar energi, vill se fler skolor och föreningar gå över till solkraft.",
    availability: "2-4 tim/vecka", country: "Sverige",
  } });
  u.ingrid = await prisma.user.create({ data: {
    name: "Ingrid Holmqvist", email: "ingrid@example.com", showProfile: true,
    bio: "Styrelseproffs med lång erfarenhet från ideell sektor och offentlig förvaltning.",
    availability: "3-5 tim/vecka", country: "Sverige",
  } });
  u.noor = await prisma.user.create({ data: {
    name: "Noor Al-Rashid", email: "noor@example.com", showProfile: true,
    bio: "Social entreprenör som byggt upp en secondhand-verksamhet med fokus på cirkulär ekonomi.",
    availability: "5-8 tim/vecka", country: "Sverige",
  } });
  u.casper = await prisma.user.create({ data: {
    name: "Casper Björklund", email: "casper@example.com", showProfile: true,
    bio: "Student i interaktionsdesign, gillar att testa nya idéer i verkliga projekt.",
    availability: "3-4 tim/vecka", country: "Sverige",
  } });
  u.yasmin = await prisma.user.create({ data: {
    name: "Yasmin Berg", email: "yasmin@example.com", showProfile: true,
    bio: "Kommunikatör på ett större bolag, engagerar sig ideellt i sin lediga tid.",
    availability: "2-3 tim/vecka", country: "Sverige",
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
    [u.klara, ["affarsutveckling", "forsaljning"]],
    [u.viktor, ["produktledning", "webbutveckling"]],
    [u.maja, ["kommunikation"]],
    [u.rasoul, ["data-science"]],
    [u.ingrid, ["juridik", "ekonomi"]],
    [u.noor, ["affarsutveckling", "marknadsforing"]],
    [u.casper, ["ux-design"]],
    [u.yasmin, ["sociala-medier", "kommunikation"]],
  ];
  for (const [user, slugs] of userSkills) {
    for (const slug of slugs) {
      await prisma.userSkill.create({ data: { userId: user.id, skillId: skills[slug].id } });
    }
  }

  console.log("Skapar organisationer...");
  const orgDefs = [
    { key: "natur", name: "Naturskyddsföreningen Lokal", slug: "naturskyddsforeningen-lokal", category: "Environment", owner: u.elin, verified: true,
      description: "Lokal avdelning som arbetar för biologisk mångfald, ren natur och opinionsbildning i närområdet." },
    { key: "roda", name: "Röda Korset Ungdom", slug: "roda-korset-ungdom", category: "Community", owner: u.linnea, verified: true,
      description: "Ungdomsrörelsen inom Röda Korset som stöttar unga i utsatta livssituationer runt om i Sverige." },
    { key: "klimat", name: "Klimatkollektivet", slug: "klimatkollektivet", category: "Environment", owner: u.marcus, verified: false,
      description: "Gräsrotsrörelse som driver på för en snabbare och rättvis klimatomställning lokalt." },
    { key: "digital", name: "Digitalt Utanförskap", slug: "digitalt-utanforskap", category: "Technology", owner: u.sara, verified: false,
      description: "Arbetar för att fler — oavsett ålder eller bakgrund — ska få tillgång till digital kompetens." },
    { key: "matsvinn", name: "Matsvinn Sverige", slug: "matsvinn-sverige", category: "Environment", owner: u.erik, verified: true,
      description: "Sprider kunskap och bygger digitala verktyg för att halvera matsvinnet i svenska hushåll och butiker." },
    { key: "laxhjalpen", name: "Läxhjälpen Väst", slug: "laxhjalpen-vast", category: "Education", owner: u.maja, verified: true,
      description: "Kopplar ihop volontära läxhjälpare med barn och unga i socioekonomiskt utsatta områden i västra Sverige." },
    { key: "konstkollektivet", name: "Konstnärskollektivet Public Art", slug: "konstnarskollektivet-public-art", category: "Arts", owner: u.casper, verified: false,
      description: "Ett kollektiv av konstnärer som skapar offentlig konst och muraler i förorter och bortglömda stadsrum." },
    { key: "halsoframjarna", name: "Hälsofrämjarna", slug: "halsoframjarna", category: "Health", owner: u.ingrid, verified: true,
      description: "Erbjuder samtalsstöd och gemenskap för äldre och andra som lever i ensamhet." },
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
    { organisationId: orgs.laxhjalpen.id, userId: u.yasmin.id, role: "MEMBER" },
    { organisationId: orgs.halsoframjarna.id, userId: u.rasoul.id, role: "MEMBER" },
  ] });

  await prisma.organisationSkill.createMany({ data: [
    { organisationId: orgs.natur.id, skillId: skills["fotografi"].id },
    { organisationId: orgs.digital.id, skillId: skills["ux-design"].id },
    { organisationId: orgs.matsvinn.id, skillId: skills["webbutveckling"].id },
    { organisationId: orgs.roda.id, skillId: skills["kommunikation"].id },
    { organisationId: orgs.laxhjalpen.id, skillId: skills["kommunikation"].id },
    { organisationId: orgs.konstkollektivet.id, skillId: skills["grafisk-design"].id },
    { organisationId: orgs.halsoframjarna.id, skillId: skills["kommunikation"].id },
  ] });

  await prisma.organisationReview.createMany({ data: [
    { organisationId: orgs.natur.id, authorId: u.sara.id, rating: 5, comment: "Superorganiserat och tydligt vad man ger sig in på. Rekommenderas!" },
    { organisationId: orgs.matsvinn.id, authorId: u.johan.id, rating: 4, comment: "Engagerat team, hade önskat lite tydligare onboarding." },
    { organisationId: orgs.laxhjalpen.id, authorId: u.klara.id, rating: 5, comment: "Fantastiskt engagerade volontärer, tydlig struktur för matchning." },
  ] });

  console.log("Skapar projekt...");
  const projectDefs = [
    { key: "renkust", slug: "ren-kust", title: "Ren Kust", org: orgs.natur, owner: u.elin, phase: "PRODUCTION", category: "Environment", commercial: false,
      sdgGoals: [14, 15], tags: ["miljö", "strandstädning", "volontär"],
      summary: "Regelbundna strandstädningar längs svenska kuster, organiserade av lokala volontärgrupper.",
      description: "Ren Kust samlar volontärer för återkommande strandstädningar längs den svenska kusten. Vi kartlägger nedskräpade områden, organiserar städdagar och rapporterar mängd och typ av skräp till Naturskyddsföreningens nationella statistik." },
    { key: "matsvinnapp", slug: "matsvinn-appen", title: "Matsvinn-appen", org: orgs.matsvinn, owner: u.erik, phase: "PILOT", category: "Environment", commercial: false,
      sdgGoals: [12], tags: ["app", "matsvinn", "webbutveckling"],
      summary: "En app som kopplar ihop butiker med osåld mat med hushåll och organisationer i närheten.",
      description: "Matsvinn-appen låter livsmedelsbutiker lägga upp mat som annars skulle slängas, så att privatpersoner och organisationer kan hämta den innan den går till spillo. Prototypen testas just nu i tre butiker i Göteborg." },
    { key: "digitalvag", slug: "digital-vagledning", title: "Digital Vägledning för Nyanlända", org: orgs.digital, owner: u.sara, phase: "IDEA", category: "Education", commercial: false,
      sdgGoals: [10, 4], tags: ["digital inkludering", "utbildning"],
      summary: "Enkla, illustrerade guider som hjälper nyanlända navigera svenska myndigheters digitala tjänster.",
      description: "Många digitala myndighetstjänster i Sverige förutsätter en digital vana som nyanlända sällan hunnit bygga upp. Projektet tar fram bildbaserade, flerspråkiga guider tillsammans med språkcaféer runt om i landet." },
    { key: "kladbytardagen", slug: "kladbytardagen", title: "Klädbytardagen", org: orgs.klimat, owner: u.marcus, phase: "ESTABLISH", category: "Environment", commercial: false,
      sdgGoals: [12], tags: ["cirkulär ekonomi", "event"],
      summary: "Återkommande klädbytardagar som minskar konsumtion och stärker lokal gemenskap.",
      description: "Klädbytardagen arrangerar återkommande bytesevent där deltagare tar med kläder de inte längre använder och byter till sig något nytt. Konceptet har spridit sig till åtta orter under det senaste året." },
    { key: "ungdomsjouren", slug: "ungdomsjouren-online", title: "Ungdomsjouren Online", org: orgs.roda, owner: u.linnea, phase: "PRODUCTION", category: "Health", commercial: false,
      sdgGoals: [3], tags: ["stödverksamhet", "ungdomar"],
      summary: "Ett digitalt stödchat bemannat av utbildade volontärer för unga som mår dåligt.",
      description: "Ungdomsjouren Online erbjuder ett tryggt digitalt rum där unga kan chatta anonymt med utbildade volontärer om allt från ensamhet till psykisk ohälsa. Volontärer genomgår en obligatorisk utbildning innan de bemannar chatten." },
    { key: "solceller", slug: "solceller-for-skolor", title: "Solceller för Skolor", org: null, owner: u.oskar, phase: "IDEA", category: "Environment", commercial: false,
      sdgGoals: [7, 4], tags: ["förnybar energi", "utbildning"],
      summary: "Finansieringsmodell och pedagogiskt material för att sätta solceller på skoltak.",
      description: "Idén är att kombinera lokal crowdfunding med ett pedagogiskt paket, så att skolor både får solceller på taket och undervisningsmaterial om förnybar energi kopplat till den egna anläggningen." },
    { key: "mentorskap", slug: "mentorskap-ensamkommande", title: "Mentorskap för Ensamkommande", org: orgs.roda, owner: u.linnea, phase: "PILOT", category: "Community", commercial: false,
      sdgGoals: [4, 10], tags: ["mentorskap", "integration"],
      summary: "Matchar ensamkommande ungdomar med vuxna mentorer för studie- och yrkesvägledning.",
      description: "Projektet matchar ensamkommande ungdomar 16–20 år med vuxna volontärmentorer för regelbundna träffar kring studier, yrkesval och att bygga nätverk i sin nya hemort." },
    { key: "oppendata", slug: "oppen-data-klimat", title: "Öppen Data för Klimatinitiativ", org: null, owner: u.marcus, phase: "ESTABLISH", archived: true, category: "Technology", commercial: false,
      sdgGoals: [13, 17], tags: ["data", "klimat", "öppen källkod"],
      summary: "Ett öppet dataset över svenska klimatinitiativ, avslutat efter att data flyttades till Naturvårdsverket.",
      description: "Projektet byggde och underhöll en öppen databas över lokala klimatinitiativ i Sverige. Efter två framgångsrika år togs datasetet över av Naturvårdsverket och projektet avslutades formellt." },
    { key: "skrapplockar", slug: "skrapplockar-appen", title: "Skräpplockar-appen", org: null, owner: u.nadia, phase: "ESTABLISH", category: "Environment", commercial: false,
      sdgGoals: [11, 15], tags: ["app", "skräpplockning", "gamification"],
      summary: "En app som gamifierar skräpplockning i stadsmiljö med poäng och lokala topplistor.",
      description: "Skräpplockar-appen låter användare fotografera och logga skräp de plockar upp i sin stad, samlar poäng och tävlar mot andra stadsdelar. Appen har nu över 4 000 registrerade användare." },
    { key: "gigplattformen", slug: "gigplattformen-for-goda-krafter", title: "Gigplattformen", org: null, owner: u.klara, phase: "PRODUCTION", category: "Technology", commercial: true,
      sdgGoals: [8, 17], tags: ["marknadsplats", "frilans", "impact"],
      summary: "En marknadsplats där yrkesverksamma säljer korta, betalda impact-uppdrag till ideella organisationer.",
      description: "Gigplattformen matchar frilansande specialister — allt från utvecklare till ekonomer — med korta, betalda uppdrag hos ideella organisationer som annars inte har råd att anlita konsulter. Plattformen tar en mindre serviceavgift per uppdrag och är i dagsläget lönsam i liten skala." },
    { key: "greenbox", slug: "greenbox", title: "GreenBox", org: null, owner: u.viktor, phase: "PILOT", category: "Environment", commercial: true,
      sdgGoals: [12, 2], tags: ["matsvinn", "prenumeration", "lokal mat"],
      summary: "En prenumerationslåda med räddad, lokal mat som annars hade slängts av producenter och grossister.",
      description: "GreenBox samlar in säsongens överskottsgrönsaker och räddad mat direkt från lokala odlare och grossister och levererar som en veckovis prenumerationslåda. Prototypen testas just nu med 40 betalande hushåll i Göteborgsområdet." },
    { key: "andrachansen", slug: "andra-chansen-mode", title: "Andra Chansen Mode", org: null, owner: u.noor, phase: "ESTABLISH", category: "Arts", commercial: true,
      sdgGoals: [12], tags: ["secondhand", "mode", "cirkulär ekonomi"],
      summary: "En kurerad secondhand-marknadsplats för mode, med provisionsbaserad affärsmodell.",
      description: "Andra Chansen Mode låter privatpersoner sälja sina secondhand-kläder genom en kurerad, kvalitetskontrollerad marknadsplats. Plattformen tar en provision på varje såld artikel och har byggt upp en lojal kundkrets på över 3000 aktiva köpare." },
    { key: "karriarkompassen", slug: "karriarkompassen", title: "KarriärKompassen", org: null, owner: u.klara, phase: "IDEA", category: "Technology", commercial: true,
      sdgGoals: [8], tags: ["rekrytering", "karriär", "impact-jobb"],
      summary: "En rekryteringsplattform som specialiserar sig på jobb inom impact- och hållbarhetssektorn.",
      description: "Idén är att bygga en nischad rekryteringsplattform som matchar kandidater med arbetsgivare inom klimat, social hållbarhet och civilsamhälle — med en prenumerationsmodell för arbetsgivare som vill annonsera tjänster." },
    { key: "laxhjalpendigital", slug: "laxhjalpen-digital", title: "Läxhjälpen Digital", org: orgs.laxhjalpen, owner: u.maja, phase: "PILOT", category: "Education", commercial: false,
      sdgGoals: [4, 10], tags: ["utbildning", "volontär", "matchning"],
      summary: "Ett digitalt bokningssystem som matchar volontära läxhjälpare med elever efter ämne och tid.",
      description: "Läxhjälpen Digital ersätter dagens Excel-baserade schemaläggning med ett enkelt bokningssystem där volontärer lägger upp lediga tider och elever bokar hjälp inom det ämne de behöver stöd i." },
    { key: "muralprojektet", slug: "muralprojektet-i-fororten", title: "Muralprojektet i Förorten", org: orgs.konstkollektivet, owner: u.casper, phase: "PRODUCTION", category: "Arts", commercial: false,
      sdgGoals: [11], tags: ["konst", "stadsmiljö", "gemenskap"],
      summary: "Konstnärer och lokala unga skapar tillsammans muraler som förvandlar bortglömda platser i förorten.",
      description: "Muralprojektet parar ihop professionella konstnärer med lokala ungdomar för att gemensamt måla muraler på husfasader, garage och underjordiska passager. Hittills har åtta muraler färdigställts i tre stadsdelar." },
    { key: "samtalsjouren", slug: "samtalsjouren-for-aldre", title: "Samtalsjouren för Äldre", org: orgs.halsoframjarna, owner: u.ingrid, phase: "ESTABLISH", category: "Health", commercial: false,
      sdgGoals: [3], tags: ["ensamhet", "äldre", "samtalsstöd"],
      summary: "Volontärer ringer eller videosamtalar regelbundet med äldre som lever i ensamhet.",
      description: "Samtalsjouren för Äldre matchar volontärer med äldre personer för regelbundna telefon- eller videosamtal. Tjänsten har vuxit stadigt sedan starten och har idag runt 200 aktiva samtalspar varje vecka." },
    { key: "tillganglig", slug: "tillganglig-kollektivtrafik", title: "Tillgänglig Kollektivtrafik", org: null, owner: u.rasoul, phase: "IDEA", category: "Technology", commercial: false,
      sdgGoals: [11, 10], tags: ["tillgänglighet", "kollektivtrafik", "data"],
      summary: "Crowdsourcad information om vilka hållplatser och stationer som faktiskt är tillgängliga för rullstol och rollator.",
      description: "Idén är att bygga en app där resenärer kan rapportera och verifiera tillgänglighet vid hållplatser och stationer — trasiga hissar, avsaknad av ramper etc. — och dela informationen öppet med både resenärer och trafikhuvudmän." },
    { key: "katastrofberedskap", slug: "katastrofberedskap-volontar", title: "Katastrofberedskap Volontär", org: orgs.roda, owner: u.linnea, phase: "ESTABLISH", archived: true, category: "Community", commercial: false,
      sdgGoals: [11, 17], tags: ["krisberedskap", "volontär", "samordning"],
      summary: "Ett pilotverktyg för att snabbt kalla in och samordna volontärer vid kriser, senare övertaget av kommunen.",
      description: "Projektet byggde ett samordningsverktyg för att snabbt kunna mobilisera utbildade krisvolontärer vid till exempel skogsbränder eller översvämningar. Efter en lyckad pilotperiod togs verktyget över och vidareutvecklas nu av Västra Götalandsregionen." },
  ];
  const projects = {};
  for (const p of projectDefs) {
    projects[p.key] = await prisma.project.create({ data: {
      slug: p.slug, title: p.title, summary: p.summary, description: p.description,
      phase: p.phase, ...(p.archived ? { archivedAt: new Date() } : {}), visibility: "public", category: p.category, tags: p.tags, sdgGoals: p.sdgGoals,
      commercial: p.commercial, ownerId: p.owner.id, orgId: p.org?.id ?? null,
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
    { projectId: projects.gigplattformen.id, userId: u.viktor.id, role: "ADMIN" },
    { projectId: projects.greenbox.id, userId: u.rasoul.id, role: "MEMBER" },
    { projectId: projects.andrachansen.id, userId: u.yasmin.id, role: "MEMBER" },
    { projectId: projects.laxhjalpendigital.id, userId: u.casper.id, role: "MEMBER" },
    { projectId: projects.muralprojektet.id, userId: u.maja.id, role: "MEMBER" },
    { projectId: projects.samtalsjouren.id, userId: u.noor.id, role: "MEMBER" },
  ] });

  await prisma.projectSkill.createMany({ data: [
    { projectId: projects.matsvinnapp.id, skillId: skills["webbutveckling"].id },
    { projectId: projects.matsvinnapp.id, skillId: skills["ux-design"].id },
    { projectId: projects.digitalvag.id, skillId: skills["grafisk-design"].id },
    { projectId: projects.solceller.id, skillId: skills["fundraising"].id },
    { projectId: projects.skrapplockar.id, skillId: skills["webbutveckling"].id },
    { projectId: projects.gigplattformen.id, skillId: skills["webbutveckling"].id },
    { projectId: projects.gigplattformen.id, skillId: skills["affarsutveckling"].id },
    { projectId: projects.greenbox.id, skillId: skills["forsaljning"].id },
    { projectId: projects.andrachansen.id, skillId: skills["marknadsforing"].id },
    { projectId: projects.karriarkompassen.id, skillId: skills["produktledning"].id },
    { projectId: projects.laxhjalpendigital.id, skillId: skills["webbutveckling"].id },
    { projectId: projects.tillganglig.id, skillId: skills["data-science"].id },
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
    { projectSlug: projects.gigplattformen.slug, authorId: u.klara.id, title: "500 genomförda uppdrag", body: "Vi har nu förmedlat 500 betalda impact-uppdrag mellan frilansare och ideella organisationer sedan starten." },
    { projectSlug: projects.andrachansen.slug, authorId: u.noor.id, title: "3000 aktiva köpare", body: "Vår community av köpare har passerat 3000 personer — och vi förbereder nu lansering i tre nya städer." },
  ] });

  await prisma.milestone.createMany({ data: [
    { projectId: projects.renkust.id, title: "Genomför 10 strandstädningar", description: "Nå tio genomförda städdagar under året.", status: "in_progress", createdById: u.elin.id },
    { projectId: projects.matsvinnapp.id, title: "Lansera i 10 butiker", description: "Utöka prototypen från 3 till 10 butiker.", status: "pending", createdById: u.marcus.id },
    { projectId: projects.kladbytardagen.id, title: "Nå 10 orter", description: "Klädbytardagen arrangerad på minst tio orter.", status: "done", createdById: u.marcus.id },
    { projectId: projects.gigplattformen.id, title: "1000 genomförda uppdrag", description: "Dubbla antalet förmedlade uppdrag sedan lansering.", status: "in_progress", createdById: u.klara.id },
    { projectId: projects.samtalsjouren.id, title: "300 aktiva samtalspar", description: "Utöka från 200 till 300 aktiva samtalspar per vecka.", status: "in_progress", createdById: u.ingrid.id },
  ] });

  console.log("Skapar idéer...");
  const ideaDefs = [
    { key: "secondhand", title: "Karta över second-hand-butiker", author: u.nadia, category: "Economy",
      problem: "Det är svårt att hitta second-hand-butiker och bytesmarknader i sin egen stad.",
      solution: "En crowdsourcad karta där användare kan lägga till och betygsätta second-hand-ställen.",
      sdgGoals: [12], tags: ["cirkulär ekonomi", "karta"] },
    { key: "verktygslada", title: "Digital verktygslåda för lokala föreningar", author: u.sara, category: "Community",
      problem: "Små ideella föreningar saknar ofta enkla digitala verktyg för medlemshantering och ekonomi.",
      solution: "En samlad, gratis verktygslåda med mallar för medlemsregister, budget och stadgar.",
      sdgGoals: [17], tags: ["föreningsliv", "verktyg"] },
    { key: "klimatbudget", title: "Klimatbudget för hushåll", author: u.oskar, category: "Environment",
      problem: "Många vill minska sitt klimatavtryck men vet inte var de ska börja.",
      solution: "En enkel app som räknar hushållets klimatavtryck och föreslår konkreta åtgärder rankade efter effekt.",
      sdgGoals: [13], tags: ["klimat", "app"] },
    { key: "mentorsnatverk", title: "Mentorsnätverk för unga entreprenörer", author: u.linnea, category: "Economy",
      problem: "Unga med samhällsdrivna affärsidéer saknar ofta tillgång till erfarna mentorer.",
      solution: "Ett strukturerat mentorsprogram som matchar unga entreprenörer med erfarna volontärer från näringslivet.",
      sdgGoals: [8, 4], tags: ["entreprenörskap", "mentorskap"] },
    { key: "reparationsabonnemang", title: "Reparationsabonnemang för elektronik", author: u.rasoul, category: "Economy",
      problem: "Elektronik som lätt hade kunnat repareras slängs istället för att lagas.",
      solution: "Ett månadsabonnemang som ger obegränsad tillgång till lokala repair cafés och uthyrning av lånedatorer under tiden.",
      sdgGoals: [12], tags: ["reparation", "cirkulär ekonomi"] },
    { key: "bokaenvolontar", title: "Boka-en-volontär för äldre", author: u.maja, category: "Health",
      problem: "Äldre som bor själva har ofta ingen att följa med på vardagsärenden som apoteks- och läkarbesök.",
      solution: "En enkel bokningsapp där äldre kan boka en volontär för sällskap vid vardagsärenden.",
      sdgGoals: [3, 10], tags: ["äldre", "sällskap"] },
    { key: "mikroinvest", title: "Mikroinvesteringar i lokala sociala företag", author: u.klara, category: "Economy",
      problem: "Sociala företag i tidig fas har svårt att få tillgång till riskvilligt kapital.",
      solution: "En crowdinvesteringsplattform där privatpersoner kan mikroinvestera i lokala sociala företag mot en andel av framtida intäkter.",
      sdgGoals: [8, 17], tags: ["crowdfunding", "socialt företagande"] },
    { key: "hallbarhetsranking", title: "Skolval baserat på hållbarhet", author: u.ingrid, category: "Policy",
      problem: "Föräldrar som väljer skola saknar jämförbar information om skolors klimat- och hållbarhetsarbete.",
      solution: "En öppen databas som samlar in och rankar skolors hållbarhetsarbete utifrån offentlig data.",
      sdgGoals: [4, 13], tags: ["skola", "hållbarhet", "data"] },
    { key: "kompetensbytet", title: "Hyr-en-kompetens mellan föreningar", author: u.yasmin, category: "Community",
      problem: "Små föreningar har ofta överskott av en kompetens och underskott av en annan vid olika tillfällen.",
      solution: "Ett internt bytesnätverk (tidsbank) där föreningar kan låna ut och låna in kompetens av varandra utan pengar inblandade.",
      sdgGoals: [17], tags: ["föreningsliv", "tidsbank"] },
  ];
  const ideas = {};
  for (const i of ideaDefs) {
    ideas[i.key] = await prisma.idea.create({ data: {
      title: i.title, problem: i.problem, solution: i.solution, category: i.category, sdgGoals: i.sdgGoals, tags: i.tags,
      authorId: i.author.id, status: "open",
    } });
  }
  await prisma.ideaVote.createMany({ data: [
    { ideaId: ideas.secondhand.id, userId: u.elin.id }, { ideaId: ideas.secondhand.id, userId: u.marcus.id },
    { ideaId: ideas.klimatbudget.id, userId: u.sara.id }, { ideaId: ideas.klimatbudget.id, userId: u.erik.id },
    { ideaId: ideas.verktygslada.id, userId: u.johan.id },
    { ideaId: ideas.mikroinvest.id, userId: u.viktor.id }, { ideaId: ideas.mikroinvest.id, userId: u.noor.id },
    { ideaId: ideas.bokaenvolontar.id, userId: u.fatima.id },
    { ideaId: ideas.reparationsabonnemang.id, userId: u.marcus.id },
  ] });
  await prisma.ideaEndorsement.createMany({ data: [
    { ideaId: ideas.klimatbudget.id, userId: u.marcus.id },
    { ideaId: ideas.mentorsnatverk.id, userId: u.fatima.id },
    { ideaId: ideas.mikroinvest.id, userId: u.erik.id },
    { ideaId: ideas.hallbarhetsranking.id, userId: u.johan.id },
  ] });
  await prisma.ideaComment.createMany({ data: [
    { ideaId: ideas.secondhand.id, authorId: u.johan.id, content: "Bra idé! Skulle vara najs med filter per stad." },
    { ideaId: ideas.klimatbudget.id, authorId: u.sara.id, content: "Skulle gärna testa detta som volontär om ni behöver UX-hjälp." },
    { ideaId: ideas.mikroinvest.id, authorId: u.oskar.id, content: "Intressant modell, undrar hur ni tänkt kring risk för investerarna." },
    { ideaId: ideas.bokaenvolontar.id, authorId: u.linnea.id, content: "Vi hade nytta av något liknande i vårt eget projekt, gärna dela erfarenheter!" },
  ] });

  console.log("Skapar finansieringskampanjer...");
  const renkustCampaign = await prisma.fundingCampaign.create({ data: {
    projectId: projects.renkust.id, title: "Stötta fler strandstädningar", description: "Pengarna går till sopsäckar, griptänger och resor till nya kuststräckor.",
    goal: 30000, campaignType: "donation", status: "active",
  } });
  await prisma.fundingPledge.createMany({ data: [
    { campaignId: renkustCampaign.id, userId: u.sara.id, amount: 500, message: "Bra initiativ!" },
    { campaignId: renkustCampaign.id, userId: u.fatima.id, amount: 250 },
    { campaignId: renkustCampaign.id, userId: u.oskar.id, amount: 1000, message: "Kör hårt!" },
  ] });

  const matsvinnCampaign = await prisma.fundingCampaign.create({ data: {
    projectId: projects.matsvinnapp.id, title: "Skala upp till fler butiker", description: "Finansiering för att gå från 3 till 10 butiker under året.",
    goal: 75000, campaignType: "donation", status: "active",
  } });
  await prisma.fundingPledge.createMany({ data: [
    { campaignId: matsvinnCampaign.id, userId: u.johan.id, amount: 2000, message: "Viktig fråga, glad att bidra." },
    { campaignId: matsvinnCampaign.id, userId: u.nadia.id, amount: 500 },
  ] });

  const andrachansenCampaign = await prisma.fundingCampaign.create({ data: {
    projectId: projects.andrachansen.id, title: "Lansera i tre nya städer", description: "Kampanjen finansierar lager, marknadsföring och lokala partnerskap i tre nya städer.",
    goal: 100000, campaignType: "reward", status: "active",
  } });
  const tackKort = await prisma.fundingRewardTier.create({ data: {
    campaignId: andrachansenCampaign.id, title: "Tack-kort", description: "Ett personligt tack-kort från teamet.", minAmount: 100, sortOrder: 0,
  } });
  const rabattTier = await prisma.fundingRewardTier.create({ data: {
    campaignId: andrachansenCampaign.id, title: "20% rabattkod", description: "En rabattkod på 20% i webbutiken.", minAmount: 300, maxBackers: 200, sortOrder: 1,
  } });
  const vipTier = await prisma.fundingRewardTier.create({ data: {
    campaignId: andrachansenCampaign.id, title: "VIP-medlemskap ett år", description: "Förtur till nya kollektioner i ett år.", minAmount: 1000, maxBackers: 50, sortOrder: 2,
  } });
  await prisma.fundingPledge.createMany({ data: [
    { campaignId: andrachansenCampaign.id, userId: u.casper.id, amount: 100, rewardTierId: tackKort.id },
    { campaignId: andrachansenCampaign.id, userId: u.yasmin.id, amount: 300, rewardTierId: rabattTier.id },
    { campaignId: andrachansenCampaign.id, userId: u.viktor.id, amount: 1000, rewardTierId: vipTier.id, message: "Lycka till med expansionen!" },
  ] });

  console.log("Skapar projektkanaler och meddelanden...");
  const chatProjects = [
    { project: projects.renkust, owner: u.elin, members: [u.amir, u.fatima], messages: [
      [u.elin, "Välkomna till Ren Kust! Här kör vi planering och avstämningar."],
      [u.amir, "Har precis laddat upp bilder från senaste städningen i filerna 📸"],
      [u.fatima, "Grymt, jag skriver ihop ett kort inlägg om det till bloggen."],
    ] },
    { project: projects.matsvinnapp, owner: u.erik, members: [u.marcus, u.sara], messages: [
      [u.erik, "Nästa butik som ska med är ICA på Hisingen — någon som har tid att åka dit denna vecka?"],
      [u.marcus, "Jag kan ta det på torsdag, hör av mig om jag stöter på tekniska problem."],
      [u.sara, "Skickar med en uppdaterad onboarding-guide till butikspersonalen innan dess."],
    ] },
    { project: projects.gigplattformen, owner: u.klara, members: [u.viktor], messages: [
      [u.klara, "500 uppdrag genomförda! Bra jobbat allihop 🎉"],
      [u.viktor, "Ser också att konverteringen från intresseanmälan till genomfört uppdrag gått upp senaste månaden."],
      [u.klara, "Bra, då fortsätter vi trimma matchningsflödet."],
    ] },
  ];
  for (const cp of chatProjects) {
    const memberList = [cp.owner, ...cp.members];
    const channelDefs = [
      { name: "allmänt", postingPolicy: "ALL_MEMBERS", order: 0 },
      { name: "beslut", postingPolicy: "LEADS_ONLY", order: 1 },
      { name: "ideer", postingPolicy: "ALL_MEMBERS", order: 2 },
    ];
    for (const cd of channelDefs) {
      const room = await prisma.room.create({ data: {
        type: "PROJECT_CHANNEL", projectId: cp.project.id, name: cd.name, postingPolicy: cd.postingPolicy, order: cd.order,
      } });
      await prisma.roomParticipant.createMany({ data: memberList.map((m, idx) => ({
        roomId: room.id, userId: m.id, role: idx === 0 ? "OWNER" : "MEMBER",
      })) });
      if (cd.name === "allmänt") {
        for (const [author, body] of cp.messages) {
          await prisma.message.create({ data: { roomId: room.id, authorId: author.id, body } });
        }
      }
    }
  }

  console.log("Skapar aktivitetshändelser...");
  await prisma.activityEvent.createMany({ data: [
    { projectId: projects.renkust.id, userId: u.amir.id, type: "member_joined" },
    { projectId: projects.muralprojektet.id, userId: u.casper.id, type: "member_joined" },
    { projectId: projects.gigplattformen.id, userId: u.klara.id, type: "update_posted", payload: { title: "500 genomförda uppdrag" } },
    { projectId: projects.andrachansen.id, userId: u.noor.id, type: "milestone_added", payload: { title: "3000 aktiva köpare" } },
    { projectId: projects.samtalsjouren.id, userId: u.ingrid.id, type: "milestone_completed", payload: { title: "200 aktiva samtalspar per vecka" } },
    { projectId: projects.matsvinnapp.id, userId: u.marcus.id, type: "update_posted", payload: { title: "Prototypen live i tre butiker" } },
  ] });

  console.log("Skapar impact-mätvärden...");
  const impactDefs = [
    { projectSlug: projects.renkust.slug, label: "Insamlat skräp", unit: "kg", targetValue: 2000, currentValue: 850, description: "Total mängd skräp insamlad vid strandstädningar.", updatedBy: u.elin, note: "Uppdaterat efter senaste städdagen." },
    { projectSlug: projects.matsvinnapp.slug, label: "Räddad mat", unit: "kg", targetValue: 5000, currentValue: 1200, description: "Mängd mat räddad undan matsvinn via appen.", updatedBy: u.erik, note: "Räknat över samtliga tre pilotbutiker." },
    { projectSlug: projects.samtalsjouren.slug, label: "Aktiva samtalspar", unit: "par", targetValue: 300, currentValue: 200, description: "Antal aktiva volontär–senior-par per vecka.", updatedBy: u.ingrid, note: "Stadig tillväxt senaste kvartalet." },
    { projectSlug: projects.gigplattformen.slug, label: "Genomförda uppdrag", unit: "uppdrag", targetValue: 1000, currentValue: 540, description: "Totalt antal betalda uppdrag förmedlade sedan lansering.", updatedBy: u.klara, note: "Halvvägs till nästa milstolpe." },
  ];
  for (const m of impactDefs) {
    const metric = await prisma.impactMetric.create({ data: {
      projectSlug: m.projectSlug, label: m.label, unit: m.unit, targetValue: m.targetValue, currentValue: m.currentValue, description: m.description,
    } });
    await prisma.impactUpdate.create({ data: {
      impactMetricId: metric.id, value: m.currentValue, note: m.note, updatedById: m.updatedBy.id,
    } });
  }

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
    // These two are looked up by exact title from the app itself — the Kanban
    // board's and Lean Canvas's "Hjälp" links (tasks/page.tsx, lean-canvas/page.tsx)
    // fall back to a generic Academy category filter if a guide with this title
    // doesn't exist yet, so keep the titles exactly in sync with those lookups.
    { title: "Så använder du Kanban", category: "Projektledning", difficulty: "beginner", readTimeMinutes: 6, author: u.elin,
      body: `# Så använder du Kanban

Varje projekt på GoodTribes har en Kanban-tavla under fliken **Uppgifter** — här bryter ni ner projektet i konkreta uppgifter, fördelar dem mellan er och håller koll på vad som är på gång.

## Tre vyer

Uppe till höger kan du växla mellan tre sätt att se uppgifterna. Ditt val kommer ihåg per projekt.

- **Tavla** — den klassiska Kanban-vyn med kort i kolumner. Standardvyn.
- **Lista** — samma uppgifter grupperade under varje kolumn, bra när du snabbt vill bocka av saker. Klart-sektionen är hopfälld som standard.
- **Gantt** — en tidslinje där varje kort visas som ett stapel mellan start- och slutdatum. Dra i staplarna för att ändra datum.

## Kolumnerna

Uppgifter går genom fem kolumner, i den här ordningen:

**Backlog → Att göra → Pågår → Granskning → Klart**

Varje kolumnrubrik visar hur många kort som ligger där och hur många underuppgifter som fortfarande är obockade. Projektledare (grundare/admin) har en meny (···) på varje kolumn för att rensa hela kolumnen på en gång.

## Flytta ett kort

Dra och släpp kortet till en annan kolumn på tavlan, eller bocka i checkrutan i listvyn. Alla projektmedlemmar kan flytta kort mellan kolumner — **utom** till Klart: om du inte är projektledare hamnar kortet i Granskning istället, så att en ledare kan godkänna det innan det räknas som klart.

## Skapa och fylla i ett kort

Klicka på **+ Lägg till kort** (eller "+" direkt på en kolumn) för att skapa ett nytt kort. Du behöver vara inloggad. Ett kort kan innehålla:

- Titel och en fritextbeskrivning
- Prioritet (Låg / Normal / Hög / Akut), visas som en färgad prick
- Kategori (Teknik, Design, Ekonomi, Strategi, Admin, Community), visas som en färgad rand överst på kortet
- Ansvarig person, vald bland projektets medlemmar
- Start- och slutdatum
- Underuppgifter — en checklista med egen förloppsindikator. Du kan lägga till, redigera och ta bort punkter, eller göra om en underuppgift till ett eget kort

Den som skapade kortet, eller en projektledare, kan ta bort det.

## Gilla och kommentera

Alla inloggade projektmedlemmar kan gilla (hjärta) och kommentera ett kort — både direkt på tavlan via en kompakt gilla/kommentera-rad, och i den fullständiga kommentarstråden när du öppnar kortet. Du kan alltid ta bort dina egna kommentarer.

## Filtrera och sök

Verktygsfältet ovanför tavlan låter dig filtrera på kategori, prioritet och ansvarig, eller söka fritt på titel. Klicka **Rensa** för att nollställa filtren.

## Bra att veta

- Att flytta ett kort till Klart som icke-ledare skickar det till Granskning — det är inte ett fel, utan tänkt att fungera som ett enkelt godkännandesteg.
- Listvyns Klart-sektion är hopfälld i grunden, så tavlan inte känns rörig när ni kommit igång.` },
    { title: "Så använder du Lean Canvas", category: "Projektledning", difficulty: "beginner", readTimeMinutes: 6, author: u.elin,
      body: `# Så använder du Lean Canvas

Lean Canvas är projektets endasidiga affärs- och verksamhetsmodell — ett samlat ställe att formulera vilket problem ni löser, för vem, och hur. Varje projekt på GoodTribes har sin egen canvas under fliken **Verktyg → Lean Canvas**.

## De 13 rutorna

Canvasen är uppdelad i 13 rutor, upplagda i tre rader på datorn (och staplade under varandra på mobilen). Varje ruta har en kort ledtråd som beskriver vad som hör hemma där:

- **Problem** — vilka är de tre problem som är mest värda att lösa?
- **Alternativ** — hur löser folk problemet idag, utan er?
- **Lösning** — era möjliga lösningar på problemen ovan
- **Nyckeltal** — hur mäter ni att det faktiskt fungerar?
- **Unikt värdeerbjudande** — ett tydligt budskap som gör er annorlunda
- **Koncept** — vad är pitchen, i en mening?
- **Orättvis fördel** — något ni har som inte lätt kan kopieras eller köpas
- **Kanaler** — vägarna ni når era målgrupper genom
- **Kundsegment** — vilka är målgrupperna och de tidiga användarna riktade mot?
- **Tidiga användare** — vilka blir era allra första användare?
- **Kostnadsstruktur** — de största kostnaderna för att driva projektet
- **Impact** — vilken skillnad gör ni, konkret?
- **Intäktsströmmar** — hur (om alls) finansieras projektet?

## Redigera en ruta

Varje ruta redigeras och sparas för sig via en egen **Redigera**-knapp — ni behöver alltså inte fylla i allt på en gång. Det är projektledare (grundare/admin) som kan redigera rutorna; övriga besökare och medlemmar ser innehållet som text, eller "Inte ifyllt än." om rutan är tom.

## Kommentera

Under rutorna finns en gemensam kommentarstråd för hela canvasen (inte en per ruta). Alla riktiga projektmedlemmar — det vill säga alla roller utom följare — kan skriva kommentarer, och kan ta bort sina egna. Om en kommentar är olämplig går den att flagga för granskning.

## Bra att veta

- Det är helt okej att lämna rutor tomma till att börja med och fylla i dem allt eftersom — canvasen är tänkt att uppdateras i takt med att ni lär er mer om er egen idé.
- Eftersom varje ruta sparas för sig kan ni jobba på olika delar av canvasen vid olika tillfällen utan att riskera att skriva över varandras text.` },
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
  feedPosts.push(await prisma.feedPost.create({ data: { authorId: u.klara.id, body: "Gigplattformen passerade nyss 500 genomförda uppdrag mellan frilansare och ideella organisationer — och vi är fortfarande lönsamma i liten skala. 🚀" } }));
  feedPosts.push(await prisma.feedPost.create({ data: { authorId: u.noor.id, body: "Andra Chansen Mode har nu över 3000 aktiva köpare! Nästa steg: lansera i tre nya städer via vår crowdfunding-kampanj." } }));

  // Exercise the new like/comment/flag/share system across a few content types.
  await prisma.feedLike.createMany({ data: [
    { userId: u.marcus.id, targetType: "feedPost", targetId: feedPosts[0].id },
    { userId: u.sara.id, targetType: "feedPost", targetId: feedPosts[0].id },
    { userId: u.elin.id, targetType: "feedPost", targetId: feedPosts[1].id },
    { userId: u.fatima.id, targetType: "organisation", targetId: orgs.natur.id },
    { userId: u.oskar.id, targetType: "organisation", targetId: orgs.natur.id },
    { userId: u.marcus.id, targetType: "academyGuide", targetId: guides["GDPR för ideella föreningar"].id },
    { userId: u.elin.id, targetType: "project", targetId: projects.renkust.id },
    { userId: u.viktor.id, targetType: "project", targetId: projects.gigplattformen.id },
    { userId: u.casper.id, targetType: "project", targetId: projects.andrachansen.id },
  ] });
  await prisma.feedComment.createMany({ data: [
    { authorId: u.fatima.id, targetType: "feedPost", targetId: feedPosts[0].id, body: "Så fint att läsa! 🙌" },
    { authorId: u.sara.id, targetType: "organisation", targetId: orgs.natur.id, body: "Var med på strandstädningen i somras, superbra organiserat!" },
    { authorId: u.erik.id, targetType: "academyGuide", targetId: guides["GDPR för ideella föreningar"].id, body: "Tack Johan, väldigt konkret och lätt att följa." },
    { authorId: u.marcus.id, targetType: "wikiPage", targetId: wikiPages.renkustSakerhet.id, body: "Bra att ni la till punkten om farligt avfall, hände en incident förra året." },
    { authorId: u.noor.id, targetType: "feedPost", targetId: feedPosts[3].id, body: "Grymt tempo! Får ni fler frilansare att signa upp organiskt eller via marknadsföring?" },
  ] });

  console.log("Klart!");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
