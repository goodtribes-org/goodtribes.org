import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const STAGES = ["Koncept", "Prototyp", "Produktion", "Leverans"];

const PROJECTS = [
  {
    slug: "kickfix",
    name: "Kickfix",
    tagline: "Marknadsplats för svenska frilansuppdrag",
    stack: ["React", "Express", "MongoDB"],
    url: "https://kickfix.se",
    stage: 2,
    finance: { raised: 245000, goal: 400000 },
    tasks: { done: 89, total: 120 },
    contributors: [
      "Anna Lindgren",
      "Marcus Holm",
      "Sara Björk",
      "Erik Strand",
      "Johanna Mård",
      "Patrik Lund",
    ],
    partners: ["VINNOVA", "Tillväxtverket"],
    story: [
      "Kickfix skapades för att lösa ett verkligt problem på den svenska frilansmarknaden: bristen på en pålitlig, lokalt anpassad plattform där uppdragsgivare och frilansare kan hitta varandra utan krångel.",
      "Plattformen erbjuder inbyggd kommunikation, betalningsuppföljning och ett escrow-system som skyddar båda parter. Genom att integrera svensk bankinfrastruktur och BankID-verifiering bygger vi förtroende från grunden.",
      "Vi lanserade beta i januari 2024 och har sedan dess onboardat 340 frilansare och 120 uppdragsgivare. Nästa steg är att bygga ut matchningsalgoritmen och lägga till stöd för kollektivavtalsenliga ersättningsnivåer.",
    ],
    features: [
      { title: "Publicera uppdrag", desc: "Skapa detaljerade uppdragsbeskrivningar med budget, tidslinje och kompetenskrav." },
      { title: "Inbyggd kommunikation", desc: "Chatta direkt med kandidater utan att lämna plattformen." },
      { title: "Betalningsuppföljning", desc: "Fakturor, betalstatus och påminnelser samlade på ett ställe." },
      { title: "Escrow-system", desc: "Pengarna hålls säkert tills uppdragets milstolpar är godkända." },
      { title: "Omdömen & betyg", desc: "Transparent feedbacksystem som bygger förtroende över tid." },
    ],
    milestones: [
      { date: "Jan 2024", title: "Beta-lansering", desc: "Första versionen live med 50 inbjudna testanvändare." },
      { date: "Mar 2024", title: "BankID-integration", desc: "Säker identitetsverifiering för alla användare." },
      { date: "Maj 2024", title: "340 frilansare", desc: "Nådde kritisk massa för matchning i Stockholmsregionen." },
      { date: "Sep 2024", title: "Escrow v1", desc: "Lanserade betalskydd för uppdrag över 10 000 SEK." },
    ],
  },
  {
    slug: "asylguiden-se",
    name: "Asylguiden.se",
    tagline: "Informationssajt för asylsökande och nyanlända i Sverige",
    stack: ["Next.js", "Strapi", "PostgreSQL"],
    url: "https://asylguiden.se",
    stage: 3,
    finance: { raised: 120000, goal: 120000 },
    tasks: { done: 210, total: 210 },
    contributors: [
      "Fatima Al-Hassan",
      "Jonas Eriksson",
      "Leila Nouri",
      "David Osei",
    ],
    partners: ["FORMAS", "Migrationsverket", "Röda Korset"],
    story: [
      "Asylguiden.se startade som ett volontärprojekt 2022 när vi insåg att nyanlända ofta hade svårt att hitta korrekt och aktuell information om asylprocessen — information som ofta var utspridd på myndighetswebbplatser på svår svenska.",
      "Lösningen är en flerspråkig informationssajt med automatiska datainsamlare som hämtar och bearbetar innehåll från Migrationsverket, Arbetsförmedlingen och Försäkringskassan. Innehållet presenteras på 12 språk med tydlig, lättläst svenska som bas.",
      "Sajten nås idag av över 8 000 unika besökare i månaden och har fått erkännande från UNHCR Sverige som ett föredömligt civilsamhällsprojekt. Projektet är nu i leveransfas och förvaltas löpande av ett litet team.",
    ],
    features: [
      { title: "Flerspråkigt innehåll", desc: "Information på 12 språk inkl. arabiska, dari, somaliska och tigrinja." },
      { title: "Automatiserad datainsamling", desc: "Spiders hämtar uppdateringar från myndigheter varje natt." },
      { title: "Mobilanpassat", desc: "Optimerat för låg bandbredd och äldre smartphones." },
      { title: "Offline-stöd", desc: "Viktigaste sidorna cachas lokalt via service worker." },
      { title: "Tillgänglighet", desc: "Följer WCAG 2.1 AA och är testad med skärmläsare." },
    ],
    milestones: [
      { date: "Okt 2022", title: "Projektstart", desc: "Volontärteam startar med manuellt redigerat innehåll på 3 språk." },
      { date: "Mar 2023", title: "Automatisering", desc: "Första generationen av myndighetsspiders driftsätts." },
      { date: "Aug 2023", title: "12 språk", desc: "Fullt stöd för 12 språk med modererade översättningar." },
      { date: "Jan 2024", title: "8 000 besökare/mån", desc: "Nådde kritisk synlighet och UNHCR-erkännande." },
    ],
  },
];

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate">
        {initials}
      </div>
      <span className="text-xs text-dark-slate/60 text-center leading-tight">{name.split(" ")[0]}</span>
    </div>
  );
}

export async function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: `${project.name} — GoodTribes.org`,
    description: project.tagline,
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const activeTab = "Berättelse";

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-dark-slate/50">
        <Link href="/projects" className="hover:text-dark-slate transition-colors">Projekt</Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate">{project.name}</span>
      </nav>

      {/* TOP SECTION */}
      <div className="grid grid-cols-5 gap-8 mb-10">
        {/* Left: hero image */}
        <div className="col-span-3">
          <div className="relative w-full aspect-video bg-dark-slate rounded overflow-hidden">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-slate/80 to-dark-slate text-white text-center px-8">
              <p className="text-2xl font-bold leading-snug">{project.name}</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                <svg className="w-6 h-6 text-dark-slate ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right: project info */}
        <div className="col-span-2 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-slate mb-1">{project.name}</h1>
            <p className="text-sm text-dark-slate/60">{project.tagline}</p>
          </div>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span key={tech} className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded">
                {tech}
              </span>
            ))}
          </div>

          {/* Finance progress */}
          <div>
            <div className="flex justify-between text-xs text-dark-slate/60 mb-1">
              <span>Finansiering</span>
              <span>{project.finance.raised.toLocaleString("sv-SE")} / {project.finance.goal.toLocaleString("sv-SE")} SEK</span>
            </div>
            <ProgressBar value={project.finance.raised} max={project.finance.goal} color="#ff6f59" />
          </div>

          {/* Task progress */}
          <div>
            <div className="flex justify-between text-xs text-dark-slate/60 mb-1">
              <span>Arbete</span>
              <span>{project.tasks.done} / {project.tasks.total} Uppgifter</span>
            </div>
            <ProgressBar value={project.tasks.done} max={project.tasks.total} color="#43aa8b" />
          </div>

          {/* CTA + share */}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide hover:bg-watermelon transition-colors"
            >
              Besök projektet →
            </a>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded border border-muted-teal text-dark-slate text-sm hover:border-dark-slate transition-colors">
              👁 Följ
            </button>
            <div className="flex gap-2 ml-auto">
              <span className="text-dark-slate/40 hover:text-dark-slate cursor-pointer text-lg">𝕏</span>
              <span className="text-dark-slate/40 hover:text-dark-slate cursor-pointer text-lg">f</span>
              <span className="text-dark-slate/40 hover:text-dark-slate cursor-pointer text-lg">🔗</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-5 gap-8">
        {/* Left: tabs + content */}
        <div className="col-span-3">
          {/* Tabs */}
          <div className="border-b border-muted-teal/40 mb-6">
            <div className="flex gap-6">
              {["Berättelse", "Funktioner", `Uppdateringar ${project.milestones.length}`].map((label) => {
                const isActive = label.startsWith(activeTab) || label === activeTab;
                return (
                  <button
                    key={label}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? "border-coral text-coral"
                        : "border-transparent text-dark-slate/50 hover:text-dark-slate"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage card */}
          <div className="border border-muted-teal/30 rounded p-4 mb-6">
            <p className="text-sm font-semibold text-dark-slate mb-2">{STAGES[project.stage]}</p>
            <div className="relative flex items-center gap-0 mb-1">
              <div className="absolute left-[12px] right-[12px] top-[11px] h-0.5 bg-gray-200 z-0" />
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex-1 flex flex-col items-center z-10">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      i <= project.stage
                        ? "bg-seagrass border-seagrass"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {i <= project.stage && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex">
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex-1 text-center">
                  <span className={`text-xs ${i <= project.stage ? "text-dark-slate font-medium" : "text-dark-slate/40"}`}>
                    {stage}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-muted-teal/20">
              <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wider mb-1">Höjdpunkter</p>
              <p className="text-xs text-dark-slate/70 flex items-center gap-1">
                <span>👤</span> {project.contributors.length} bidragsgivare
              </p>
            </div>
          </div>

          {/* Story */}
          <div className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed space-y-4">
            {project.story.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {/* Right: contributors + status + links */}
        <div className="col-span-2 flex flex-col gap-8">
          {/* Contributors */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Teamet</h2>
            <div className="grid grid-cols-4 gap-3">
              {project.contributors.map((name) => (
                <MemberAvatar key={name} name={name} />
              ))}
            </div>
          </section>

          {/* Features */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Funktioner</h2>
            <div className="flex flex-col gap-3">
              {project.features.map((f) => (
                <div key={f.title} className="flex items-start gap-2">
                  <span className="text-seagrass mt-0.5 text-sm">✓</span>
                  <div>
                    <p className="text-sm font-medium text-dark-slate">{f.title}</p>
                    <p className="text-xs text-dark-slate/60 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Partners */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Partners</h2>
            <div className="flex flex-col gap-2">
              {project.partners.map((p) => (
                <span key={p} className="text-sm font-bold tracking-tight text-dark-slate">{p}</span>
              ))}
            </div>
          </section>

          {/* Milestones */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Milstolpar</h2>
            <div className="flex flex-col gap-3">
              {project.milestones.map((m) => (
                <div key={m.title} className="flex gap-3">
                  <span className="text-xs text-dark-slate/40 w-16 flex-shrink-0 pt-0.5">{m.date}</span>
                  <div>
                    <p className="text-sm font-medium text-dark-slate">{m.title}</p>
                    <p className="text-xs text-dark-slate/60 leading-snug">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
