"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
    body: "Alla människor har idéer och drömmar kan göra världen bättre för dem och andra. Problemet är att de flesta aldrig genomför sina ideer eller drömmar. Forskningen visar att över 92 % av alla människor aldrig når sina mål och drömmar. Forskningen visar på att tre stora hinder stoppar människor från att förverkliga sina livsdrömmar:",
    obstacles: [
      { lead: "Rädsla för misslyckande:", text: "Den evolutionära rädslan för att förlora status eller resurser är oftast starkare än drivkraften att vinna, vilket gör att vi väljer trygghet framför förändring." },
      { lead: "Mentala blockeringar:", text: "Många intalar sig själva att de saknar rätt talang eller förutsättningar, vilket leder till att de aldrig tar det första steget." },
      { lead: "Vaga målsättningar:", text: "Drömmar förblir ofta abstrakta tankar. Utan konkreta, mätbara delmål i vardagen är det svårt att omsätta visioner till verklig handling." },
    ],
    closing: "GoodTribes är utformad för att hjälpa dig förbi alla hinder…",
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
    body: "Forskning inom socialt entreprenörskap och effektiv altruism visar att drömmen om att göra världen bättre kräver ett vetenskapligt och småskaligt tillvägagångssätt för att lyckas. Att starta med mikroprojekt skyddar dig mot altruistisk utbrändhet och emotionell utmattning, eftersom klyftan mellan din insats och det globala problemet annars blir för stor. Genom att testa idén i liten skala säkrar du din egen långsiktiga ork.",
    body2: "Små pilottester fungerar som ett effektivt verktyg för att mäta projektets faktiska genomslagskraft innan du satsar stora resurser. Det tvingar dig också att interagera direkt med målgruppen, vilket minskar risken för att du bygger en lösning baserad på egna antaganden i stället för på människors verkliga behov. Forskningen betonar att de mest framgångsrika initiativen bygger på just denna datadrivna och flexibla metodik, där metoden hela tiden anpassas efter verkliga resultat.",
    menuLabel: "Testa",
    tint: "bg-dry-sage/20",
  },
  {
    src: "/img/what-is-goodtribes.png",
    alt: "Vad är GoodTribes?",
    heading: "Tillsammans når vi längre",
    body: "Att testa och förverkliga en livsdröm tillsammans med andra ger enorma fördelar enligt forskning inom socialpsykologi och organisationsteori.",
    body2: "Här är de främsta vetenskapliga fördelarna med att dela resan:",
    obstacles: [
      { lead: "Hjälper mot utbrändhet:", text: "Delat ansvar minskar den emotionella tyngden i altruistiskt arbete och motverkar empatitrötthet genom socialt stöd." },
      { lead: "Ökar handlingskraften:", text: "Kollektiv effektivitet (collective efficacy) – tron på att man kan förändra saker tillsammans – höjer motivationen och gör att gruppen vågar ta större risker än individen." },
      { lead: "Breddar kompetensen:", text: "Olika människor bidrar med olika kognitiva perspektiv, vilket behövs för att lösa komplexa samhällsproblem." },
      { lead: "Skapar sund social press:", text: "Att redovisa sina framsteg för en grupp (accountability) gör att man faktiskt slutför sina mikrotester i stället för att ge upp vid första hinder." },
      { lead: "Ger direkt feedback:", text: "Gruppen fungerar som ett inbyggt bollplank som kan syna felaktiga antaganden innan idén möter verkligheten." },
    ],
    menuLabel: "Utveckla",
    tint: "bg-watermelon/10",
  },
  {
    src: "/img/want-to-be-a-winner.png",
    alt: "Vill du bidra?",
    heading: "Alla vinner på att göra gott",
    body: "Forskning inom positiv psykologi visar att människan blomstrar som bäst när hedonistisk lycka (att leva och må gott) balanseras med eudaimonisk lycka (att göra gott och följa sina livsdrömmar). Att enbart fokusera på materiell trygghet och njutning leder snabbt till att vi vänjer oss, vilket ger en kortvarig lycka. Samtidigt visar studier att enbart uppoffringar för andra utan egen återhämtning leder till utbrändhet. Det är i symbiosen mellan njutning och mening som långsiktigt välbefinnande skapas.",
    body2: "Enligt självbestämmandeteorin drivs vi av behoven av autonomi, kompetens och samhörighet. Att följa sina livsdrömmar ger en känsla av sammanhang (KASAM), vilket skyddar mot psykisk ohälsa. När vi dessutom gör gott för andra reagerar hjärnan med ett så kallat ”helper's high” – en frisättning av oxytocin och dopamin som sänker stress och förlänger livet. Att väva samman personlig livskvalitet med att göra skillnad är därför det mest effektiva receptet för ett hållbart och meningsfullt liv enligt forskningen.",
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
            <Image src={photo.src} alt="" fill unoptimized className="object-cover blur-2xl scale-110" sizes="100vw" />
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
                        <h1 className="text-3xl md:text-4xl font-bold text-dark-slate" style={{ textWrap: "balance" }}>
                          <span style={{ fontSize: 30 }}>Välkommen till GoodTribes</span>
                        </h1>
                        <p className="mt-4 text-dark-slate/80">
                          GoodTribes.org är en öppen &rdquo;drömfabrik&rdquo; där människor och organisationer kan
                          samverka för att förverkligar idéer och drömmar som medverkar till en långsiktigt hållbar
                          miljö- och samhällsutveckling.
                        </p>
                        <p className="mt-3 text-dark-slate/80">
                          GoodTribes är en ideell, opolitisk, oreligiös stiftelse som har som mål att hjälpa
                          människor och organisationer att göra världen bättre. GoodTribes vision är en
                          långsiktigt hållbar miljö- och samhällsutveckling, där alla människor ges möjlighet att
                          förverkliga sina idéer/drömmar, sin fulla potential och samtidigt Leva Gott, Må Gott och
                          Göra Gott för sig själv och andra.
                        </p>
                        <p className="mt-3 text-dark-slate/80">
                          Har du några minuter över för att göra världen bättre för dig och andra så{" "}
                          <Link href="/login" className="text-coral font-semibold hover:underline">
                            logga in
                          </Link>{" "}
                          och bli en del av GoodTribes community.
                        </p>
                      </>
                    ) : (
                      <>
                        <h1 className="text-3xl md:text-4xl font-bold text-dark-slate" style={{ textWrap: "balance" }}>
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
                    <Image src={current.src} alt={current.alt} fill unoptimized className="object-cover" />
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
