// One-off script: populate /sandbox with 30 "make the world better" sample
// projects spread across all lifecycle phases. Not part of the tracked
// prisma/seed.mjs — run manually against a local dev DATABASE_URL, safe to
// re-run (clears its own previously-seeded rows by a slug prefix first).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USERS = [
  { email: "sandbox-demo-alva@example.com", name: "Alva Lindqvist" },
  { email: "sandbox-demo-noel@example.com", name: "Noel Karlsson" },
  { email: "sandbox-demo-tindra@example.com", name: "Tindra Bergström" },
  { email: "sandbox-demo-milo@example.com", name: "Milo Ahmadi" },
  { email: "sandbox-demo-saga@example.com", name: "Saga Holm" },
  { email: "sandbox-demo-leo@example.com", name: "Leo Petrovic" },
  { email: "sandbox-demo-wilma@example.com", name: "Wilma Ström" },
  { email: "sandbox-demo-elias@example.com", name: "Elias Novak" },
];

const AI_EMAIL = "ai@goodtribes.org";

const PROJECTS = [
  { slug: "regnvattenskordare", title: "Regnvattenskördare för skolgårdar", category: "Environment", sdgGoals: [6, 4], tags: ["vattenskörd", "skolor"], phase: "IDEA",
    summary: "Enkla, billiga regnvattensystem som skolgårdar kan bygga och underhålla själva.",
    description: "Idén är att ta fram en öppen ritning för regnvattensystem i återvunnet material som skolklasser kan bygga som ett läromoment, och som sedan används för skolträdgårdens bevattning." },
  { slug: "mikrolan-unga", title: "Mikrolån för unga entreprenörer", category: "Community", sdgGoals: [1, 8], tags: ["mikrolån", "entreprenörskap"], phase: "IDEA",
    summary: "Ett community-drivet mikrolånesystem för unga som saknar tillgång till traditionell finansiering.",
    description: "Låntagare rekommenderas av andra i nätverket i stället för kreditupplysning, och lånen är små (1000-5000 kr) för att komma igång med en första affärsidé." },
  { slug: "solceller-hyresratter", title: "Solcellsdelning i hyresrätter", category: "Environment", sdgGoals: [7, 11], tags: ["solenergi", "hyresrätt"], phase: "IDEA",
    summary: "En modell för att dela solcellsproducerad el rättvist mellan hyresgäster i flerbostadshus.",
    description: "Idag saknar de flesta hyresgäster möjlighet att installera egna solceller. Projektet undersöker juridiska och tekniska modeller för delad solel i hyresfastigheter." },
  { slug: "digital-mentorskapsbank", title: "Digital mentorskapsbank", category: "Education", sdgGoals: [4, 10], tags: ["mentorskap", "digitalt"], phase: "IDEA",
    summary: "En öppen plattform som matchar volontärmentorer med ungdomar utifrån intresse, inte bara ort.",
    description: "Många mentorskapsprogram begränsas av geografi. Idén är en digital matchningstjänst som gör mentorskap på distans lika naturligt som på plats." },
  { slug: "havsstadarrobotar", title: "Havsstädarrobotar", category: "Environment", sdgGoals: [14], tags: ["hav", "robotik"], phase: "IDEA",
    summary: "Småskaliga, öppet designade robotar som samlar in plast i hamnar och skärgårdar.",
    description: "Bygger vidare på befintliga open source-robotprojekt men med fokus på svenska skärgårdsförhållanden och lokal tillverkning av volontärer." },

  { slug: "kompostkollektivet", title: "Kompostkollektivet", category: "Environment", sdgGoals: [12, 11], tags: ["kompost", "grannskap"], phase: "PROJECT",
    summary: "Delade komposter för grannskap utan egen trädgård, med hämtning av matavfall på cykel.",
    description: "Ett grannskapsnätverk som delar på ett fåtal komposter, med volontärer som hämtar matavfall med lastcykel varje vecka och delar ut färdig jord i gengäld." },
  { slug: "sprakcafeer-online", title: "Språkcaféer online", category: "Community", sdgGoals: [10, 4], tags: ["språk", "integration"], phase: "PROJECT",
    summary: "Videobaserade språkcaféer som kopplar ihop nyanlända med svensktalande volontärer.",
    description: "Ett komplement till fysiska språkcaféer för den som inte kan ta sig till en lokal — bygger vidare på konceptet men helt digitalt, med enkla videorum utan konto." },
  { slug: "fixarverkstan", title: "Fixarverkstan", category: "Community", sdgGoals: [12], tags: ["reparation", "verkstad"], phase: "PROJECT",
    summary: "Öppna reparationsverkstäder där volontärer hjälper grannar laga trasiga prylar.",
    description: "Inspirerat av Repair Café-rörelsen men med fokus på att bygga upp lokala volontärnätverk av personer med reparationskunskap." },
  { slug: "cykelverkstad-nyanlanda", title: "Cykelverkstad för nyanlända", category: "Community", sdgGoals: [10, 11], tags: ["cykel", "integration"], phase: "PROJECT",
    summary: "Skänkta cyklar rustas upp av volontärer och delas ut till nyanlända familjer.",
    description: "Cyklar som annars skulle skrotas samlas in, lagas av volontärer med mekanikerkunskap, och delas ut tillsammans med en kort cykelsäkerhetskurs." },

  { slug: "biodlare-staden", title: "Biodlare i staden", category: "Environment", sdgGoals: [15, 11], tags: ["biodling", "pollinering"], phase: "PILOT",
    summary: "Bikupor på tak och i parker sköts av volontärer, med honung som delas till närboende.",
    description: "Piloten testar 5 bikupor på olika tak i innerstaden, med utbildning för nya biodlare och uppföljning av hur stadsbiodling påverkar lokal pollinering." },
  { slug: "second-hand-appen", title: "Second hand-appen", category: "Environment", sdgGoals: [12], tags: ["cirkulär ekonomi", "app"], phase: "PILOT",
    summary: "En app för att snabbt hitta och boka avlämningstider på lokala second hand-butiker.",
    description: "Piloten testas med tre butiker i Göteborg — appen minskar tröskeln att skänka kläder genom att visa exakt vad butiken behöver just nu." },
  { slug: "foraldraledighetspoolen", title: "Föräldraledighetspoolen", category: "Community", sdgGoals: [5, 8], tags: ["föräldraskap", "jämställdhet"], phase: "PILOT",
    summary: "Ett nätverk där föräldralediga kan dela barnpassning för att kunna ta korta konsultuppdrag.",
    description: "Piloten testas med 15 familjer i en stadsdel — målet är att göra det lättare att hålla kontakt med arbetslivet under föräldraledigheten utan att tumma på jämställd fördelning." },
  { slug: "naringsrik-skollunch", title: "Näringsrik skollunch", category: "Health", sdgGoals: [2, 3], tags: ["skolmat", "hälsa"], phase: "PILOT",
    summary: "Ett recept- och inköpsverktyg som hjälper skolkök laga näringsriktig mat billigare.",
    description: "Piloten körs på tre skolor och jämför näringsvärde och matsvinn före och efter verktyget införts." },

  { slug: "vattenrenare-byar", title: "Vattenrenare för byar", category: "Environment", sdgGoals: [6], tags: ["vattenrening", "landsbygd"], phase: "PRODUCTION",
    summary: "Enkla, solcellsdrivna vattenreningsstationer för byar utan tillgång till rent dricksvatten.",
    description: "I skarp drift på fem platser. Varje station renar upp till 2000 liter vatten om dagen och sköts av lokalt utbildade volontärer." },
  { slug: "jobbcoachning-aldre", title: "Jobbcoachning för äldre", category: "Community", sdgGoals: [8, 10], tags: ["arbetsmarknad", "seniorer"], phase: "PRODUCTION",
    summary: "Matchning och coachning för personer 55+ som vill tillbaka till arbetsmarknaden.",
    description: "I skarp drift med löpande matchning mellan erfarna jobbsökande och lokala arbetsgivare, med volontärcoacher som stöd genom hela processen." },
  { slug: "trygg-skolvag", title: "Trygg skolväg", category: "Community", sdgGoals: [11, 3], tags: ["trafiksäkerhet", "barn"], phase: "PRODUCTION",
    summary: "Volontärer som vandrande skolbussar följer barn till skolan längs kartlagda säkra vägar.",
    description: "Rullar i skarp drift i tre stadsdelar, med scheman skötta av föräldraföreningar och en enkel app för att se vem som går vilken dag." },
  { slug: "klimatsmart-matlada", title: "Klimatsmart matlåda", category: "Environment", sdgGoals: [12, 13], tags: ["matsvinn", "klimat"], phase: "PRODUCTION",
    summary: "Överskottsmat från butiker och restauranger lagas om till matlådor och säljs till självkostnadspris.",
    description: "Driver ett kök i skarp drift, räddar ca 200 kg mat i veckan och säljer matlådor till reducerat pris till hushåll med låg inkomst." },
  { slug: "digital-vardcentral-landsbygd", title: "Digital vårdcentral på landsbygden", category: "Health", sdgGoals: [3, 10], tags: ["vård", "landsbygd"], phase: "PRODUCTION",
    summary: "Videobaserad vårdrådgivning kombinerad med volontärskjuts till fysiska besök vid behov.",
    description: "I skarp drift i tre glesbygdskommuner, med samarbete med lokala vårdcentraler och en volontärpool för skjuts när ett fysiskt besök krävs." },

  { slug: "second-hand-marknaden", title: "Second hand-marknaden", category: "Environment", sdgGoals: [12], tags: ["cirkulär ekonomi", "marknad"], phase: "ESTABLISH",
    summary: "Återkommande secondhandmarknader som samlar lokala second hand-aktörer på samma plats.",
    description: "Etablerad verksamhet med kvartalsvisa marknader i fem städer, stabil volontärorganisation och egen ekonomi genom bordsavgifter." },
  { slug: "gron-taknatverk", title: "Grön taknätverk", category: "Environment", sdgGoals: [11, 13], tags: ["gröna tak", "biologisk mångfald"], phase: "ESTABLISH",
    summary: "Ett nätverk av fastighetsägare som tillsammans finansierar och sköter gröna tak.",
    description: "Etablerad förening med över 40 anslutna fastigheter, egen kunskapsbank och återkommande utbildningar för nya fastighetsägare." },
  { slug: "ungas-psykiska-halsa", title: "Ungas psykiska hälsa", category: "Health", sdgGoals: [3], tags: ["psykisk hälsa", "unga"], phase: "ESTABLISH",
    summary: "Ungdomsledda stödgrupper för psykisk hälsa, utbildade och handledda av psykologer.",
    description: "Etablerad verksamhet i åtta kommuner med återkommande finansiering och en stabil kår av utbildade ungdomsledare." },
  { slug: "kvinnliga-entreprenorsnatverket", title: "Kvinnliga entreprenörsnätverket", category: "Community", sdgGoals: [5, 8], tags: ["entreprenörskap", "jämställdhet"], phase: "ESTABLISH",
    summary: "Ett etablerat nätverk för kvinnor som startar och driver egna verksamheter.",
    description: "Har funnits i fyra år med regelbundna träffar, mentorskap och en väletablerad medlemsbas i sju regioner." },
  { slug: "skoldatorer-andra-hand", title: "Skoldatorer i andra hand", category: "Education", sdgGoals: [4, 12], tags: ["digital utbildning", "återbruk"], phase: "ESTABLISH",
    summary: "Uttjänta skoldatorer rustas upp av volontärer och delas ut till familjer utan råd att köpa nytt.",
    description: "Etablerad verksamhet som samarbetar med tio kommuners skolförvaltningar, med en stabil grupp volontärer som gör upprustningen." },

  { slug: "regnbagsfonden", title: "Regnbågsfonden", category: "Community", sdgGoals: [10, 16], tags: ["hbtqi", "stöd"], phase: "SCALE",
    summary: "Stödfond och nätverk för hbtqi-personer som möter diskriminering, nu under regional replikering.",
    description: "Modellen från ursprungsstaden replikeras nu till fyra nya regioner, med lokala team som anpassar arbetet efter lokala behov." },
  { slug: "klimatskolan", title: "Klimatskolan", category: "Education", sdgGoals: [13, 4], tags: ["klimatutbildning", "skola"], phase: "SCALE",
    summary: "Ett klimatutbildningspaket för högstadiet som nu sprids till fler kommuner.",
    description: "Efter en framgångsrik etablering i en kommun skalas materialet och lärarutbildningen nu upp till ytterligare tolv kommuner." },
  { slug: "delningsverkstaden", title: "Delningsverkstaden", category: "Environment", sdgGoals: [12, 11], tags: ["verktygsbibliotek", "delningsekonomi"], phase: "SCALE",
    summary: "Verktygsbibliotek där grannar lånar verktyg av varandra i stället för att köpa nytt, nu i flera städer.",
    description: "Ursprungskonceptet har visat sig så populärt att fem nya lokala instanser har startats av volontärer på andra orter." },
  { slug: "landsbygdsbredband", title: "Landsbygdsbredband", category: "Technology", sdgGoals: [9, 11], tags: ["bredband", "landsbygd"], phase: "SCALE",
    summary: "Byalag som gemensamt bygger fiberinfrastruktur, med en modell som nu sprids till fler byalag.",
    description: "Ursprungsbyns modell för finansiering och grävarbete har visat sig fungera så bra att ytterligare sex byalag nu replikerar upplägget." },

  { slug: "ren-insjo", title: "Ren Insjö", category: "Environment", sdgGoals: [6, 15], tags: ["sjörestaurering", "vattenkvalitet"], phase: "IMPACT",
    summary: "Ett mångårigt restaureringsarbete som mätbart återställt vattenkvaliteten i en övergödd sjö.",
    description: "Efter sju års arbete visar mätningarna en tydlig förbättring av vattenkvaliteten och återkomst av flera fiskarter som tidigare försvunnit." },
  { slug: "matbanken", title: "Matbanken", category: "Community", sdgGoals: [2, 1], tags: ["matsäkerhet", "fattigdom"], phase: "IMPACT",
    summary: "Ett nätverk av matbanker som mätbart minskat matfattigdomen i de kommuner där de verkar.",
    description: "Uppföljning visar att andelen hushåll som uppger att de saknat mat under månaden har minskat markant i de kommuner där Matbanken verkat i över tre år." },
  { slug: "cykelstaden", title: "Cykelstaden", category: "Environment", sdgGoals: [11, 13], tags: ["cykelinfrastruktur", "klimat"], phase: "IMPACT",
    summary: "Ett medborgarinitiativ för bättre cykelinfrastruktur som mätbart ökat cykelpendlingen.",
    description: "Efter flera års påverkansarbete och egna pilotinstallationer av cykelbanor visar kommunens egna mätningar en tydlig ökning av cykelpendling och minskade bilresor." },
];

async function main() {
  console.log("Rensar tidigare sandbox-demoprojekt...");
  const slugs = PROJECTS.map((p) => p.slug);
  const existing = await prisma.project.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
  const existingIds = existing.map((p) => p.id);
  if (existingIds.length > 0) {
    await prisma.room.deleteMany({ where: { projectId: { in: existingIds } } });
    await prisma.projectMember.deleteMany({ where: { projectId: { in: existingIds } } });
    await prisma.phaseTransition.deleteMany({ where: { projectId: { in: existingIds } } });
    await prisma.project.deleteMany({ where: { id: { in: existingIds } } });
  }

  console.log("Skapar demoanvändare...");
  const demoUsers = [];
  for (const u of DEMO_USERS) {
    demoUsers.push(await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, emailVerified: new Date(), showProfile: true },
    }));
  }
  const aiUser = await prisma.user.upsert({
    where: { email: AI_EMAIL },
    update: {},
    create: { email: AI_EMAIL, name: "AI", showProfile: false },
  });

  console.log("Skapar 30 sandbox-projekt...");
  let ownerIdx = 0;
  for (const p of PROJECTS) {
    // Roughly 1 in 4 projects "AI-started" — matches the real sandbox-seed cron's mix.
    const owner = ownerIdx % 4 === 3 ? aiUser : demoUsers[ownerIdx % demoUsers.length];
    ownerIdx++;

    const project = await prisma.project.create({
      data: {
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        description: p.description,
        phase: p.phase,
        visibility: "public",
        category: p.category,
        tags: p.tags,
        sdgGoals: p.sdgGoals,
        legalType: "NONPROFIT_UMBRELLA",
        ownerId: owner.id,
        isSandbox: true,
      },
    });
    await prisma.projectMember.create({ data: { projectId: project.id, userId: owner.id, role: "FOUNDER" } });
    await prisma.phaseTransition.create({
      data: { projectId: project.id, fromPhase: null, toPhase: project.phase, changedById: owner.id },
    });
    await prisma.room.createMany({
      data: [
        { type: "PROJECT_CHANNEL", projectId: project.id, name: "allmänt", postingPolicy: "ALL_MEMBERS", order: 0 },
        { type: "PROJECT_CHANNEL", projectId: project.id, name: "beslut", postingPolicy: "LEADS_ONLY", order: 1 },
        { type: "PROJECT_CHANNEL", projectId: project.id, name: "ideer", postingPolicy: "ALL_MEMBERS", order: 2 },
      ],
    });
  }

  console.log(`Klart — ${PROJECTS.length} sandbox-projekt skapade.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
