import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requestToJoin } from "./actions";

const prisma = new PrismaClient();

const SDG_GOALS = [
  { n: 1, color: "#e5243b" }, { n: 2, color: "#dda63a" }, { n: 3, color: "#4c9f38" },
  { n: 4, color: "#c5192d" }, { n: 5, color: "#ff3a21" }, { n: 6, color: "#26bde2" },
  { n: 7, color: "#fcc30b" }, { n: 8, color: "#a21942" }, { n: 9, color: "#fd6925" },
  { n: 10, color: "#dd1367" }, { n: 11, color: "#fd9d24" }, { n: 12, color: "#bf8b2e" },
  { n: 13, color: "#3f7e44" }, { n: 14, color: "#0a97d9" }, { n: 15, color: "#56c02b" },
  { n: 16, color: "#00689d" }, { n: 17, color: "#19486a" },
];

const STAGES = ["Koncept", "Prototyp", "Produktion", "Leverans"];

const DUMMY_FINANCE = { raised: 375670, goal: 500000 };
const DUMMY_WORK = { done: 183, total: 432 };
const DUMMY_OWNER_ROLE = "Full-Stack Programmers";
const DUMMY_RATING = 4.85;
const DUMMY_PARTNERS = ["FORMAS", "VINNOVA"];
const DUMMY_STORY = `Vad gör projektet unikt och innovativt?

IT IS A SCALABLE, LOCALIZED SOLUTION TO OUR GLOBAL PLASTIC CRISIS.

Vår lösning kräver inga ändringar i den befintliga återvinningsinfrastrukturen. Det gör processen enklare och sparar tid och resurser, och gör plastinsamling mycket enklare.

Med vår lösning behöver plasten inte sorteras efter typ. En stor flaskhals i återvinningsprocessen är att separera plaster efter deras återvinningsgrupper, såsom #1 PET och #2 HDPE-flaskor. Alla plaster har olika smälttemperaturer för omformning, så klassificering är viktigt.

De nuvarande metoderna för att omforma plast till tegel och block kräver dyra maskiner och använder mycket energi. Genom att använda jordsäcksdesign och byggprinciper kan vi använda plasten när den väl omvandlats till pellets. Det innebär att all plast kan blandas och skäras ihop, vilket eliminerar den mest arbetskrävande delen av processen.`;

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

export default async function OrgDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const org = await prisma.organisation.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!org) notFound();
  if (!org.isPublic && org.ownerId !== userId) notFound();

  const isOwner = org.ownerId === userId;
  const isMember = org.members.some((m) => m.userId === userId);

  const joinRequest = userId && !isOwner && !isMember
    ? await prisma.organisationJoinRequest.findUnique({
        where: { organisationId_userId: { organisationId: org.id, userId } },
      })
    : null;

  const ownerName = org.owner.name ?? org.owner.email;
  const ownerInitials = ownerName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl">
      {/* TOP SECTION */}
      <div className="grid grid-cols-5 gap-8 mb-10">
        {/* Left: project image */}
        <div className="col-span-3">
          <div className="relative w-full aspect-video bg-dark-slate rounded overflow-hidden">
            {org.imageUrl ? (
              <img src={org.imageUrl} alt={org.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-slate/80 to-dark-slate text-white text-center px-8">
                <p className="text-xl font-bold leading-snug">{org.name}</p>
              </div>
            )}
            {/* Play button overlay */}
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
            <h1 className="text-2xl font-bold text-dark-slate mb-3">{org.name}</h1>
            {!org.isPublic && (
              <span className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded">Privat</span>
            )}
          </div>

          {/* Owner info */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-sm bg-dry-sage flex-shrink-0 flex items-center justify-center text-sm font-semibold text-dark-slate">
              {ownerInitials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-dark-slate text-sm">{ownerName}</p>
              <p className="text-coral text-xs">{DUMMY_OWNER_ROLE}</p>
              <p className="text-dark-slate/50 text-xs mt-0.5 leading-snug">
                All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary.
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm font-semibold text-dark-slate">{DUMMY_RATING.toFixed(2)}</span>
                {[1,2,3,4,5].map((i) => (
                  <span key={i} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
            </div>
          </div>

          {/* Finance progress */}
          <div>
            <div className="flex justify-between text-xs text-dark-slate/60 mb-1">
              <span>Finansiering</span>
              <span>{DUMMY_FINANCE.raised.toLocaleString("sv-SE")} / {DUMMY_FINANCE.goal.toLocaleString("sv-SE")} Sek</span>
            </div>
            <ProgressBar value={DUMMY_FINANCE.raised} max={DUMMY_FINANCE.goal} color="#ff6f59" />
          </div>

          {/* Work progress */}
          <div>
            <div className="flex justify-between text-xs text-dark-slate/60 mb-1">
              <span>Arbete</span>
              <span>{DUMMY_WORK.done} / {DUMMY_WORK.total} Uppgifter</span>
            </div>
            <ProgressBar value={DUMMY_WORK.done} max={DUMMY_WORK.total} color="#43aa8b" />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {userId && !isOwner && !isMember && (
              <form action={requestToJoin}>
                <input type="hidden" name="orgId" value={org.id} />
                <button
                  type="submit"
                  disabled={!!joinRequest}
                  className="px-5 py-2 rounded bg-coral text-white text-sm font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:bg-watermelon transition-colors"
                >
                  {joinRequest ? "Skickat" : "Stöd det"}
                </button>
              </form>
            )}
            <button className="flex items-center gap-1.5 px-4 py-2 rounded border border-muted-teal text-dark-slate text-sm hover:border-dark-slate transition-colors">
              👁 Följ
            </button>
            {isOwner && (
              <Link
                href={`/org/${slug}/edit`}
                className="text-sm text-coral hover:text-seagrass underline underline-offset-4"
              >
                Redigera
              </Link>
            )}
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
        {/* Left: tabs + story */}
        <div className="col-span-3">
          {/* Tabs */}
          <div className="border-b border-muted-teal/40 mb-6">
            <div className="flex gap-6">
              {[
                { label: "Berättelse", active: true },
                { label: "FAQ", active: false },
                { label: "Uppdateringar 531", active: false },
                { label: "Kommentarer 11", active: false },
                { label: "Arbetsyta", active: false },
              ].map(({ label, active }) => (
                <button
                  key={label}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? "border-coral text-coral"
                      : "border-transparent text-dark-slate/50 hover:text-dark-slate"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Concept stage card */}
          <div className="border border-muted-teal/30 rounded p-4 mb-6">
            <p className="text-sm font-semibold text-dark-slate mb-2">Koncept</p>
            <p className="text-xs text-dark-slate/70 mb-4 leading-relaxed">
              Projektteamet har ännu inte producerat en fungerande demo för sitt koncept. Deras förmåga att framgångsrikt producera en prototyp kan påverkas av produktutveckling och ekonomiska utmaningar.{" "}
              <span className="text-coral cursor-pointer hover:underline">Läs mer</span>
            </p>

            {/* Stage progress */}
            <div className="relative flex items-center gap-0 mb-1">
              <div className="absolute left-[12px] right-[12px] top-[11px] h-0.5 bg-gray-200 z-0" />
              {STAGES.map((stage, i) => (
                <div key={stage} className="flex-1 flex flex-col items-center z-10">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      i === 0
                        ? "bg-seagrass border-seagrass"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {i === 0 && (
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
                  <span className={`text-xs ${i === 0 ? "text-dark-slate font-medium" : "text-dark-slate/40"}`}>
                    {stage}
                  </span>
                </div>
              ))}
            </div>

            {/* Highlights */}
            <div className="mt-4 pt-3 border-t border-muted-teal/20">
              <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wider mb-1">Höjdpunkter</p>
              <p className="text-xs text-dark-slate/70 flex items-center gap-1">
                <span>👤</span> {org.members.length} Projekt
              </p>
            </div>
          </div>

          {/* Story content */}
          <div className="prose prose-sm max-w-none text-dark-slate/80 leading-relaxed space-y-4">
            {DUMMY_STORY.trim().split("\n\n").map((para, i) => (
              <p key={i} className={i === 1 ? "font-bold text-dark-slate italic" : ""}>
                {para}
              </p>
            ))}
            {org.description && (
              <p className="mt-4 p-3 bg-dry-sage/30 rounded border-l-2 border-coral">
                {org.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: team + global goals + partners */}
        <div className="col-span-2 flex flex-col gap-8">
          {/* The Team */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Teamet</h2>
            <div className="grid grid-cols-4 gap-3">
              {org.members.length > 0
                ? org.members.slice(0, 12).map((m) => (
                    <MemberAvatar key={m.id} name={m.user.name ?? "Okänd"} />
                  ))
                : Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate/30">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-xs text-dark-slate/30 text-center">Medlem</span>
                    </div>
                  ))}
            </div>
          </section>

          {/* The Global Goals */}
          <section>
            <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
              The Global Goals
            </h2>
            <div className="grid grid-cols-5 gap-1">
              {SDG_GOALS.map(({ n, color }) => (
                <div
                  key={n}
                  className="aspect-square flex items-center justify-center text-white text-xs font-bold rounded-sm"
                  style={{ backgroundColor: color }}
                >
                  {n}
                </div>
              ))}
              <div className="aspect-square flex items-center justify-center bg-dark-slate rounded-sm">
                <span className="text-white text-xs font-bold">SDG</span>
              </div>
            </div>
          </section>

          {/* Partners */}
          <section>
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Partners</h2>
            <div className="flex flex-col gap-3">
              {DUMMY_PARTNERS.map((p) => (
                <div key={p} className="flex items-center">
                  <span className="text-lg font-bold tracking-tight text-dark-slate">{p}</span>
                  {p === "FORMAS" && <span className="text-coral ml-1 text-sm">✦✦</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
