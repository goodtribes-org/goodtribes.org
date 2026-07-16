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
  { n: "3", text: "Lägg upp en egen idé eller projekt", href: "/ideas/new" },
  { n: "4", text: "Bygg en tribe med människor som brinner för samma som du", href: "/projects/new" },
  { n: "5", text: "Förändra världen genom små och stora insatser", href: "/hall-of-impact" },
  { n: "6", text: "Lev gott, Må gott, Gör gott och förverkliga dina och andras drömmar", href: "/about" },
];

type Obstacle = { lead: string; text: string };

type Photo = {
  src: string;
  alt: string;
  heading: string;
  body?: string;
  body2?: string;
  obstacles?: Obstacle[];
  closing?: string;
  menuLabel: string;
  tint: string;
};

const PHOTOS: Photo[] = [
  {
    src: "/img/Slide1.jpg",
    alt: "GoodTribes — Crowdsourcing for Good",
    heading: "Välkommen till GoodTribes",
    menuLabel: "Kom igång",
    tint: "bg-coral/10",
  },
  {
    src: "/img/Slide2.png",
    alt: "Har du en dröm? — en man kedjad till sitt skrivbord drömmer om att förverkliga sin idé",
    heading: "Följ din dröm",
    body: "Alla har idéer och drömmar som kan göra världen bättre – men forskning visar att över 92 % aldrig når sina mål. Tre hinder stoppar oss:",
    obstacles: [
      { lead: "Rädsla för misslyckande", text: "– rädslan att förlora status väger tyngre än viljan att vinna, så vi väljer trygghet framför förändring." },
      { lead: "Mentala blockeringar", text: "– vi intalar oss att vi saknar rätt talang, vilket hindrar första steget." },
      { lead: "Vaga målsättningar", text: "– utan konkreta, mätbara delmål blir drömmar bara abstrakta tankar." },
    ],
    closing: "GoodTribes är utformad för att hjälpa dig förbi alla dessa hinder…",
    menuLabel: "Våga",
    tint: "bg-seagrass/10",
  },
  {
    src: "/img/do-you-have-a-dream.png",
    alt: "En person lyfts av en ballong format som en glödlampa — en idé som lyfter",
    heading: "Våga följa din dröm",
    body: "Forskningen visar att drömmen om en bättre värld kräver mer än bara goda avsikter. Det handlar om att omvandla abstrakta drömmar till konkreta, mätbara delmål styrda av personliga värderingar.",
    body2: "För att lyckas och behålla motivationen över tid krävs fyra vetenskapligt bevisade byggstenar:",
    obstacles: [
      { lead: "Inre drivkraft:", text: "Mål som gynnar andra (prosociala mål) ger störst långsiktig meningsfullhet." },
      { lead: "Mentalt kapital:", text: "Du behöver odla hopp, optimism, resiliens och tro på din egen förmåga." },
      { lead: "Gemenskap:", text: "Samarbete i nätverk motverkar apati och skapar verklig samhällsförändring." },
      { lead: "Reflektion:", text: "Att regelbundet utvärdera dina vägval håller riktningen stabil över tid." },
    ],
    closing: "Genom att kombinera personlig utveckling med kollektiv handling förvandlas stora visioner till mätbar verklighet.",
    menuLabel: "Dröm",
    tint: "bg-muted-teal/15",
  },
  {
    src: "/img/want-a-change.png",
    alt: "Vill du förändra?",
    heading: "Våga gå din egen väg",
    body: "Forskning inom socialt entreprenörskap och effektiv altruism visar att en vetenskaplig, småskalig ansats är avgörande för att lyckas göra världen bättre. Att börja med mikroprojekt skyddar mot altruistisk utbrändhet, eftersom gapet mellan insats och globalt problem annars blir för stort – småskalig testning säkrar din långsiktiga uthållighet.",
    body2: "Pilottester mäter projektets faktiska genomslagskraft innan stora resurser satsas, och tvingar fram direkt kontakt med målgruppen så att lösningen bygger på verkliga behov snarare än antaganden. De mest framgångsrika initiativen använder just denna datadrivna, flexibla metodik som ständigt anpassas efter resultat.",
    menuLabel: "Testa",
    tint: "bg-dry-sage/20",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    heading: "Tillsammans når vi längre",
    body: "Att förverkliga en livsdröm tillsammans med andra ger stora fördelar enligt forskning inom socialpsykologi och organisationsteori:",
    obstacles: [
      { lead: "Motverkar utbrändhet", text: "– delat ansvar minskar emotionell tyngd och empatitrötthet." },
      { lead: "Ökar handlingskraften", text: "– kollektiv effektivitet höjer motivationen och modet att ta risker." },
      { lead: "Breddar kompetensen", text: "– olika perspektiv behövs för att lösa komplexa problem." },
      { lead: "Skapar sund press", text: "– att redovisa framsteg för gruppen (accountability) gör att man fullföljer sina mikrotester." },
      { lead: "Ger direkt feedback", text: "– gruppen synar felaktiga antaganden innan idén möter verkligheten." },
    ],
    menuLabel: "Utveckla",
    tint: "bg-watermelon/10",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du bidra?",
    heading: "Alla vinner på att göra gott",
    body: "Positiv forskning visar att människan mår som bäst när hedonistisk lycka (att leva gott och må gott) balanseras med eudaimonisk lycka (att göra gott och följa sina drömmar). Enbart materiell njutning ger kortvarig lycka medan enbart uppoffringar utan återhämtning leder till utbrändhet – det är i symbiosen som långsiktigt välbefinnande skapas.",
    body2: "Enligt självbestämmandeteorin drivs vi av autonomi, kompetens och samhörighet. Att följa sina livsdrömmar ger skydd mot psykisk ohälsa, medan att göra gott för andra utlöser ett \"helper's high\" (oxytocin och dopamin) som sänker stress och förlänger livet. Att väva samman personlig livskvalitet med att göra skillnad är därför receptet för ett hållbart, meningsfullt liv.",
    menuLabel: "Alla vinner",
    tint: "bg-coral/15",
  },
];

export default function HeroPhotoStack() {
  const [active, setActive] = useState(0);
  const current = PHOTOS[active];
  const isIntro = active === 0;

  function goToPrev() {
    setActive((i) => (i - 1 + PHOTOS.length) % PHOTOS.length);
  }
  function goToNext() {
    setActive((i) => (i + 1) % PHOTOS.length);
  }

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

      <div className="relative z-10 flex justify-center px-4 pt-8 pb-6">
        <div className="flex w-full max-w-6xl flex-col items-center gap-6">
          <style>{`
            @keyframes heroCaptionIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hero-caption-in { animation: heroCaptionIn 0.3s ease-out; }
          `}</style>

          <nav className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-white/80 backdrop-blur-sm p-1.5 shadow-sm ring-1 ring-black/5">
            {PHOTOS.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  active === i
                    ? "bg-coral text-white shadow-sm"
                    : "text-dark-slate/60 hover:text-dark-slate hover:bg-black/5"
                }`}
              >
                {i + 1}. {photo.menuLabel}
              </button>
            ))}
          </nav>

          <div className="relative w-full">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Föregående"
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5 text-dark-slate/60 hover:text-dark-slate hover:bg-white transition-colors absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="grid w-full gap-8 items-stretch md:grid-cols-2">
            {/* Text — alltid synlig, till vänster, samma polaroid-form som bilden */}
            <div
              className="transition-transform duration-500 ease-out"
              style={{
                transform: `rotate(${-PHOTO_TILT[active].rotate}deg) translate(${-PHOTO_TILT[active].x}px, ${-PHOTO_TILT[active].y}px)`,
              }}
            >
              <div className={`min-h-full bg-white p-3 ${CARD_SHADOW}`}>
                <div className={`min-h-full border border-muted-teal/20 px-6 py-6 flex flex-col justify-start ${current.tint}`}>
                  <div key={`text-${current.src}`} className="hero-caption-in flex flex-col items-start text-left">
                    {isIntro ? (
                      <>
                        <h1 className="font-bold text-dark-slate" style={{ textWrap: "balance", fontSize: 30 }}>
                          Välkommen till GoodTribes
                        </h1>
                        <ol className="mt-5 flex flex-col gap-3">
                          {ONBOARDING_STEPS.map((s) => (
                            <li key={s.n}>
                              <a href={s.href} className="group flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-seagrass text-white text-sm font-bold flex items-center justify-center shrink-0">
                                  {s.n}
                                </span>
                                <span className="text-dark-slate/80 group-hover:text-seagrass group-hover:underline transition-colors">
                                  {s.text}
                                </span>
                                {s.n === "1" && (
                                  <span className="text-coral text-xs font-bold px-3 py-1 rounded-full border border-coral group-hover:bg-coral/5 transition-colors whitespace-nowrap">
                                    Sign in
                                  </span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      <>
                        <h1 className="font-bold text-dark-slate" style={{ textWrap: "balance", fontSize: 30 }}>
                          {current.heading}
                        </h1>
                        <p className="mt-4 text-dark-slate/80">{current.body}</p>
                        {current.body2 && (
                          <p className="mt-3 text-dark-slate/80">{current.body2}</p>
                        )}
                        {current.obstacles && (
                          <ul className="mt-4 flex flex-col gap-2">
                            {current.obstacles.map((o) => (
                              <li key={o.lead} className="text-sm text-dark-slate/80">
                                <span className="font-bold text-seagrass">{o.lead}</span> {o.text}
                              </li>
                            ))}
                          </ul>
                        )}
                        {current.closing && (
                          <p className="mt-4 text-dark-slate/80">{current.closing}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Foto — till höger */}
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

            <button
              type="button"
              onClick={goToNext}
              aria-label="Nästa"
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm ring-1 ring-black/5 text-dark-slate/60 hover:text-dark-slate hover:bg-white transition-colors absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
