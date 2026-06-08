import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import SkillManager from "@/components/SkillManager";
import { setShowProfile } from "./actions";

const prisma = new PrismaClient();

const SOCIAL_LABELS: Record<string, string> = {
  website: "Webbplats",
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "Twitter / X",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
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

  const social = (user.socialLinks ?? {}) as Record<string, string>;
  const skills = user.skills.map((us) => us.skill);
  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-dry-sage flex items-center justify-center text-2xl font-semibold text-dark-slate flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-1">{user.name ?? "Namnlös"}</h1>
          <p className="text-dark-slate/60 text-sm">{user.email}</p>
          <p className="text-xs text-muted-teal mt-1">
            Profilbild — kan läggas till senare
          </p>
        </div>
        <Link
          href="/profile/setup"
          className="flex-shrink-0 text-sm text-coral hover:text-seagrass underline underline-offset-4"
        >
          Redigera profil
        </Link>
      </div>

      <section className="mb-8">
        <form action={setShowProfile}>
          <input type="hidden" name="show" value={user.showProfile ? "false" : "true"} />
          <button
            type="submit"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              user.showProfile
                ? "border-seagrass text-seagrass hover:bg-seagrass/10"
                : "border-muted-teal text-dark-slate/50 hover:border-coral hover:text-coral"
            }`}
          >
            {user.showProfile
              ? "✓ Profilen visas på Medlemmar — klicka för att dölja"
              : "Profilen är dold — klicka för att visa på Medlemmar"}
          </button>
        </form>
      </section>

      {user.bio && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-2">
            Om mig
          </h2>
          <p className="text-dark-slate">{user.bio}</p>
        </section>
      )}

      <SkillManager skills={skills} />

      {Object.keys(social).length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            Sociala medier
          </h2>
          <ul className="flex flex-col gap-2">
            {Object.entries(social).map(([key, value]) => (
              <li key={key} className="flex items-center gap-2">
                <span className="text-xs text-dark-slate/50 w-24 flex-shrink-0">
                  {SOCIAL_LABELS[key] ?? key}
                </span>
                <a
                  href={key === "website" ? value : `https://${value.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-coral hover:text-seagrass underline underline-offset-4 truncate"
                >
                  {value}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!user.bio && Object.keys(social).length === 0 && skills.length === 0 && (
        <p className="text-dark-slate/50 italic text-sm">
          Du har inte fyllt i din profil än.{" "}
          <Link href="/profile/setup" className="text-coral hover:text-seagrass underline underline-offset-4">
            Gör det nu →
          </Link>
        </p>
      )}
    </div>
  );
}
