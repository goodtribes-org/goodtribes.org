import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";

const prisma = new PrismaClient();

const DUMMY_ROLE = "Full-Stack Utvecklare";
const DUMMY_RATING = 4.85;
const DUMMY_WORK = [
  { company: "Prodesign Inc", role: "Front End Developer", location: "Stockholm" },
  { company: "Blue Tech", role: "Senior Programmer", location: "Göteborg" },
];
const DUMMY_PHONE = "+46 70 000 00 00";
const DUMMY_ADDRESS = "Kungsgatan 1\n111 43 Stockholm";
const DUMMY_BIRTHDAY = "1 januari 1990";
const DUMMY_GENDER = "Inte specificerat";
const DUMMY_SKILLS = ["JavaScript", "React", "Node.js", "TypeScript", "CSS", "SQL"];

function SkillRing({ name }: { name: string }) {
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="#43aa8b"
          strokeWidth="2.5"
          strokeDasharray="70 30"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-center text-dark-slate leading-tight px-2">
        {name}
      </span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-3xl font-bold text-dark-slate">{rating.toFixed(2)}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="text-2xl text-yellow-400">★</span>
        ))}
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      image: true,
      country: true,
      bio: true,
      showProfile: true,
      socialLinks: true,
      skills: {
        select: {
          skill: { select: { id: true, name: true, tag: true, description: true, slug: true } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const skills = user.skills.map((us) => us.skill);
  const displaySkills = skills.length > 0 ? skills.map((s) => s.name) : DUMMY_SKILLS;
  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const location = user.country ?? "Stockholm, Sverige";

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-5 gap-8">
        {/* LEFT COLUMN */}
        <div className="col-span-2 flex flex-col gap-8">
          {/* Profile photo */}
          <div className="flex justify-center">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Profilbild"}
                width={192}
                height={192}
                className="w-48 h-48 rounded-sm object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-sm bg-dry-sage flex items-center justify-center text-5xl font-semibold text-dark-slate">
                {initials}
              </div>
            )}
          </div>

          {/* Work Experiences */}
          <section>
            <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-4">
              Arbetslivserfarenhet
            </h2>
            <div className="flex flex-col gap-4">
              {DUMMY_WORK.map((job) => (
                <div key={job.company}>
                  <p className="font-semibold text-dark-slate">{job.company}</p>
                  <p className="text-coral text-sm">{job.role}</p>
                  <p className="text-dark-slate/50 text-sm">{job.location}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Skills */}
          <section>
            <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-4">
              Kompetenser
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {displaySkills.slice(0, 6).map((name) => (
                <SkillRing key={name} name={name} />
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-3 flex flex-col gap-6">
          {/* Name + location */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-dark-slate">
                {user.name ?? "Namnlös användare"}
              </h1>
              <span className="text-sm text-dark-slate/50 flex items-center gap-1 mt-1 flex-shrink-0">
                📍 {location}
              </span>
            </div>
            <p className="text-coral font-medium mt-1">{DUMMY_ROLE}</p>
          </div>

          {/* Bio */}
          <p className="text-dark-slate/80 leading-relaxed">
            {user.bio ?? "Lorem Ipsum har länge använts som exempeltext inom tryckerier och textdesign. Det används för att fylla ut webbsidor med text."}
          </p>

          {/* Rankings */}
          <section>
            <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-2">
              Betyg
            </p>
            <StarRating rating={DUMMY_RATING} />
          </section>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded border border-muted-teal text-dark-slate text-sm hover:border-dark-slate transition-colors">
              💬 Privat meddelande
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded border border-muted-teal text-dark-slate text-sm hover:border-dark-slate transition-colors">
              🚩 Rapportera
            </button>
            <Link
              href="/profile/setup"
              className="flex items-center gap-2 px-4 py-2 rounded bg-coral text-white text-sm font-medium hover:bg-watermelon transition-colors"
            >
              ✓ Redigera profil
            </Link>
          </div>

          {/* Tabs */}
          <div className="border-b border-muted-teal/40">
            <div className="flex gap-6">
              {["Om mig", "Recensioner", "Projekt"].map((tab, i) => (
                <button
                  key={tab}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    i === 0
                      ? "border-coral text-coral"
                      : "border-transparent text-dark-slate/50 hover:text-dark-slate"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <section>
            <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
              Kontaktinformation
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-dark-slate/50">Telefon</dt>
              <dd className="text-dark-slate">{DUMMY_PHONE}</dd>
              <dt className="text-dark-slate/50">Hemadress</dt>
              <dd className="text-dark-slate whitespace-pre-line">{DUMMY_ADDRESS}</dd>
              <dt className="text-dark-slate/50">E-postadress</dt>
              <dd>
                <a
                  href={`mailto:${user.email}`}
                  className="text-coral hover:text-seagrass underline underline-offset-4"
                >
                  {user.email}
                </a>
              </dd>
            </dl>
          </section>

          {/* Basic Information */}
          <section>
            <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">
              Grundläggande information
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-dark-slate/50">Födelsedag</dt>
              <dd className="text-dark-slate">{DUMMY_BIRTHDAY}</dd>
              <dt className="text-dark-slate/50">Kön</dt>
              <dd className="text-dark-slate">{DUMMY_GENDER}</dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
