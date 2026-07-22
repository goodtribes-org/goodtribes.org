const CARD_SHADOW =
  "shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.15)] ring-1 ring-black/5";

// Same intro photo/tilt as HeroPhotoStack's first slide, but static — no carousel.
const PHOTO = { src: "/img/Slide1.jpg", alt: "GoodTribes — Crowdsourcing for Good" };
const TILT = { rotate: -1, x: 0, y: 0 };

export default function SandboxHero() {
  return (
    <div className="relative">
      <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "400px" }}>
        <img src={PHOTO.src} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110" />
      </div>

      <div className="relative z-10 flex justify-center px-4 pt-8 pb-6">
        <div className="flex w-full max-w-6xl flex-col items-center gap-3">
          <h1
            className="text-5xl md:text-6xl font-bold text-center leading-tight"
            style={{ color: "white", textShadow: "0 3px 8px rgba(0,0,0,0.25)", marginTop: 0 }}
          >
            <span style={{ fontSize: 60 }}>Välkommen till GoodTribes</span>
          </h1>

          <div className="relative grid w-full gap-8 items-center md:grid-cols-2">
            <div style={{ transform: `rotate(${-TILT.rotate}deg) translate(${-TILT.x}px, ${-TILT.y}px)` }}>
              <div className={`h-full bg-white p-3 ${CARD_SHADOW}`}>
                <div className="h-full border border-muted-teal/20 px-6 pt-3 pb-6 flex flex-col justify-start bg-amber-50">
                  <div className="flex flex-col items-start text-left">
                    <h2 className="text-3xl md:text-4xl font-bold text-amber-900" style={{ textWrap: "balance", fontSize: 30 }}>
                      🧪 Sandbox — experimentell zon
                    </h2>
                    <p className="mt-4 text-amber-800" style={{ fontSize: 15 }}>
                      Riktiga projekt, men märkta som experimentella — testa en idé fritt innan du (eller någon annan)
                      gör den till ett vanligt projekt. Allt här kan vara AI-genererat, halvfärdigt eller under test —
                      vem som helst kan gaffla ett projekt utan tillstånd.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-self-center w-full" style={{ maxWidth: 620 }}>
              <div
                className="relative w-full min-w-0"
                style={{ aspectRatio: "16 / 10", transform: `rotate(${TILT.rotate}deg) translate(${TILT.x}px, ${TILT.y}px)` }}
              >
                <div className={`absolute inset-0 overflow-hidden bg-white p-3 ${CARD_SHADOW}`}>
                  <div className="relative h-full w-full overflow-hidden">
                    <img src={PHOTO.src} alt={PHOTO.alt} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
