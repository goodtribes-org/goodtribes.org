"use client";

import { useState } from "react";

const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Per-photo tilt/offset so the photo looks like a physical print set down a little carelessly,
// rather than a perfectly centered, perfectly straight image. The text card uses the opposite tilt.
const PHOTO_TILT = [
  { rotate: -1, x: 0, y: 0 },
  { rotate: 1.5, x: 6, y: -4 },
  { rotate: -1.5, x: -8, y: 5 },
  { rotate: 1, x: 4, y: 6 },
  { rotate: -2, x: -6, y: -3 },
  { rotate: 2, x: 8, y: 2 },
];

type OnboardingStep = { n: string; text: string; href: string };

const ONBOARDING_STEPS: OnboardingStep[] = [
  { n: "1", text: "Skapa ett konto", href: "/login" },
  { n: "2", text: "Hitta projekt som är rätt för dig", href: "/projects" },
  { n: "3", text: "\"Joina\" din Tribe som brinner för samma saker som du", href: "/projects/new" },
  { n: "4", text: "Vidareutveckla eller lägg upp en egen idé/projekt", href: "/ideas/new" },
  { n: "5", text: "Förändra världen genom små och stora insatser", href: "/hall-of-impact" },
  { n: "6", text: "Lev gott, Må gott, Gör gott och förverkliga idéer och drömmar", href: "/about" },
];

type Obstacle = { lead: string; text: string };
type PercentPoint = { pct: string; text: string };

type Photo = {
  src: string;
  alt: string;
  heading: string;
  body?: string;
  bodyLine2?: string;
  body2?: string;
  obstacles?: Obstacle[];
  outro?: string;
  points?: PercentPoint[];
  menuLabel: string;
  tint: string;
};

const PHOTOS: Photo[] = [
  {
    src: "/img/Slide1.jpg",
    alt: "GoodTribes — Crowdsourcing for Good",
    heading: "GoodTribes",
    body: "Crowdsourcing for good — gå med och gör skillnad!",
    menuLabel: "Kom igång",
    tint: "bg-coral/10",
  },
  {
    src: "/img/Slide2.png",
    alt: "Har du en dröm? — en man kedjad till sitt skrivbord drömmer om att förverkliga sin idé",
    heading: "Följ din dröm...",
    body: "Alla har idéer och drömmar som kan göra världen bättre – men forskning visar att över 92 % aldrig uppnår sina mål.",
    bodyLine2: "Tre hinder stoppar oss:",
    obstacles: [
      { lead: "Rädsla för misslyckande", text: "– rädslan att förlora väger tyngre än viljan att vinna, så vi väljer trygghet framför förändring." },
      { lead: "Mentala blockeringar", text: "– vi intalar oss att vi saknar rätt talang, vilket hindrar första steget." },
      { lead: "Vaga målsättningar", text: "– utan konkreta, mätbara delmål blir drömmar bara abstrakta fantasier." },
    ],
    outro: "GoodTribes är utformad för att hjälpa dig förbi alla hinder…",
    menuLabel: "Våga",
    tint: "bg-seagrass/10",
  },
  {
    src: "/img/do-you-have-a-dream.png",
    alt: "En person lyfts av en ballong format som en glödlampa — en idé som lyfter",
    heading: "Släpp inte taget...",
    body: "En bättre värld kräver mer än goda avsikter – drömmar måste bli konkreta, mätbara mål och delmål som involverar andra. Vetenskapen visar att sannolikheten att du faktiskt förverkligar din livsdröm ökar för varje steg du tar:",
    points: [
      { pct: "10 %", text: "Du har bara en idé eller dröm i huvudet." },
      { pct: "25 %", text: "Du bestämmer dig medvetet för att göra det." },
      { pct: "50 %", text: "Du planerar hur du ska göra det." },
      { pct: "65 %", text: "Du berättar för någon annan att du ska göra det." },
      { pct: "95 %", text: "Om du samverkar med andra med liknande mål." },
    ],
    menuLabel: "Dröm",
    tint: "bg-muted-teal/15",
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    heading: "Testa din dröm...",
    body: "Forskning inom socialt entreprenörskap och effektiv altruism visar att en vetenskaplig, småskalig ansats är avgörande för att lyckas göra världen bättre. Att börja med mikroprojekt i samverkan med andra skyddar mot altruistisk utbrändhet, eftersom gapet mellan insats och globalt problem annars blir för stort – småskalig testning säkrar din och andras långsiktiga framgång.",
    body2: "Pilottester mäter projektets faktiska genomslagskraft innan stora resurser satsas, och tvingar fram direkt kontakt med användarna så att lösningen bygger på verkliga behov snarare än antaganden. De mest framgångsrika initiativen använder just denna datadrivna, flexibla metodik som ständigt anpassas efter resultat.",
    menuLabel: "Testa",
    tint: "bg-dry-sage/20",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    heading: "Hitta din tribe...",
    body: "Att förverkliga idéer och livsdrömmar tillsammans med andra ger stora fördelar enligt forskning inom socialpsykologi och organisationsteori:",
    obstacles: [
      { lead: "Ökar handlingskraften", text: "– samverkan höjer effektiviteten, motivationen och modet." },
      { lead: "Breddar kompetensen", text: "– olika perspektiv behövs för att lösa komplexa problem." },
      { lead: "Skapar sund press", text: "– vilket ger bättre resultat." },
      { lead: "Ger direkt feedback", text: "– ger dig möjlighet att utvecklas och snabbare nå dina mål." },
      { lead: "Motverkar utbrändhet", text: "– samverkan och delat ansvar minskar tyngden att bära" },
    ],
    menuLabel: "Utveckla",
    tint: "bg-watermelon/10",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du bidra?",
    heading: "Alla vinner...",
    body: "Forskningen visar att människan mår som bäst när hedonistisk lycka (att leva gott och må gott) balanseras med eudaimonisk lycka (att göra gott och följa sina drömmar). Enbart materiell njutning ger kortvarig lycka medan enbart uppoffringar utan återhämtning leder till utbrändhet – det är i symbiosen som långsiktigt välbefinnande skapas.",
    body2: "Enligt självbestämmandeteorin drivs vi av autonomi, kompetens och samhörighet. Att följa sina livsdrömmar ger mening och skyddar mot psykisk ohälsa, medan att göra gott för andra utlöser ett \"helper's high\" (oxytocin och dopamin) som sänker stress och förlänger livet. Att väva samman personlig livskvalitet med att göra skillnad är därför receptet för ett hållbart, meningsfullt liv.",
    menuLabel: "Alla vinner",
    tint: "bg-coral/15",
  },
];

export default function HeroPhotoStack() {
  const [active, setActive] = useState(0);
  const current = PHOTOS[active];
  const isIntro = active === 0;

  return (
    <>
      {/* Bakgrund: samma bild som visas, crossfadeas vid byte */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "400px" }}>
        {PHOTOS.map((photo, i) => (
          <div
            key={photo.src}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: active === i ? 1 : 0 }}
          >
            <img src={photo.src} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-0 pb-6">
        <div className="flex w-full max-w-6xl flex-col items-center gap-3">
          <style>{`
            @keyframes heroCaptionIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
          `}</style>

          <h1
            className="text-5xl md:text-6xl font-bold text-center leading-tight"
            style={{ color: "white", textShadow: "0 3px 8px rgba(0,0,0,0.25)", marginTop: 0 }}
          >
            <span style={{ fontSize: 60 }}>Välkommen till GoodTribes</span>
          </h1>

          <div className="relative grid w-full gap-8 items-center md:grid-cols-2">
            <button
              type="button"
              onClick={() => setActive((active - 1 + PHOTOS.length) % PHOTOS.length)}
              aria-label="Föregående"
              className="absolute -left-2 md:-left-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 shadow-md ring-1 ring-black/5 flex items-center justify-center text-dark-slate/70 hover:text-dark-slate hover:bg-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setActive((active + 1) % PHOTOS.length)}
              aria-label="Nästa"
              className="absolute -right-2 md:-right-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 shadow-md ring-1 ring-black/5 flex items-center justify-center text-dark-slate/70 hover:text-dark-slate hover:bg-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Text — alltid synlig, till vänster, samma polaroid-form som bilden */}
            <div
              className="transition-transform duration-500 ease-out"
              style={{
                transform: `rotate(${-PHOTO_TILT[active].rotate}deg) translate(${-PHOTO_TILT[active].x}px, ${-PHOTO_TILT[active].y}px)`,
              }}
            >
              <div className={`h-full bg-white p-3 ${CARD_SHADOW}`}>
                <div className={`h-full border border-muted-teal/20 px-6 pt-3 pb-6 flex flex-col justify-start ${current.tint}`}>
                  <div key={`text-${current.src}`} className="hero-caption-in flex flex-col items-start text-left">
                    {isIntro ? (
                      <>
                        <h1 className="text-3xl md:text-4xl font-bold text-dark-slate" style={{ textWrap: "balance", fontSize: 30 }}>
                          Kom igång...
                        </h1>
                        <ol className="mt-4 flex flex-col gap-1.5">
                          {ONBOARDING_STEPS.map((s) => (
                            <li key={s.n} className="flex items-center gap-3">
                              <span
                                className="w-7 h-7 rounded-full bg-seagrass text-white text-sm font-bold flex items-center justify-center shrink-0"
                                style={{ width: 35, height: 35, fontSize: 16 }}
                              >
                                {s.n}
                              </span>
                              <span
                                className={`text-dark-slate/80 ${s.n === "6" ? "whitespace-nowrap" : ""}`}
                                style={{ fontSize: s.n === "6" ? 13.5 : 16 }}
                              >
                                {s.text}
                              </span>
                              {s.n === "1" && (
                                <a href="/login" className="text-coral text-xs font-bold px-3 py-1 rounded-full border border-coral hover:bg-coral/5 transition-colors whitespace-nowrap">
                                  Sign in
                                </a>
                              )}
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      <>
                        <h1 className="text-3xl md:text-4xl font-bold text-dark-slate" style={{ textWrap: "balance", fontSize: 30 }}>
                          {current.heading}
                        </h1>
                        <p className="mt-2 text-dark-slate/80" style={{ fontSize: 15 }}>
                          {current.body}
                          {current.bodyLine2 && (
                            <>
                              <br />
                              {current.bodyLine2}
                            </>
                          )}
                        </p>
                        {current.body2 && (
                          <p className="mt-3 text-dark-slate/80" style={{ fontSize: 15 }}>{current.body2}</p>
                        )}
                        {current.obstacles && (
                          <>
                            <ul className="mt-4 flex flex-col gap-3.5">
                              {current.obstacles.map((o) => (
                                <li key={o.lead} className="text-sm text-dark-slate/80">
                                  <span className="font-bold text-seagrass">{o.lead}</span> {o.text}
                                </li>
                              ))}
                            </ul>
                            {current.outro && (
                              <p className="mt-4 text-dark-slate/80" style={{ fontSize: 15 }}>{current.outro}</p>
                            )}
                          </>
                        )}
                        {current.points && (
                          <ul className="mt-5 flex flex-col gap-2">
                            {current.points.map((p) => (
                              <li key={p.pct} className="flex items-center gap-3">
                                <span className="w-14 shrink-0 text-right text-sm font-bold text-seagrass">{p.pct}</span>
                                <span className="text-sm text-dark-slate/80">{p.text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Foto — mindre, till höger */}
            <div className="hidden md:flex items-center justify-self-center w-full" style={{ maxWidth: 620 }}>
              <div
                className="relative w-full min-w-0 transition-transform duration-500 ease-out"
                style={{
                  aspectRatio: "16 / 10",
                  transform: `rotate(${PHOTO_TILT[active].rotate}deg) translate(${PHOTO_TILT[active].x}px, ${PHOTO_TILT[active].y}px)`,
                }}
              >
                <div
                  key={current.src}
                  className={`hero-caption-in absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={current.src} alt={current.alt} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
