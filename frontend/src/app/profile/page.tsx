import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";

const prisma = new PrismaClient();

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      country: true,
      bio: true,
      showProfile: true,
      socialLinks: true,
      skills: {
        select: { skill: { select: { id: true, name: true, slug: true } } },
      },
      projectMemberships: {
        include: { project: { select: { slug: true, title: true, status: true, description: true } } },
        orderBy: { joinedAt: "desc" },
        take: 6,
      },
    },
  });

  if (!user) redirect("/login");

  const skills = user.skills.map((us) => us.skill);
  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const socialLinks = (user.socialLinks ?? {}) as Record<string, string>;

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* LEFT COLUMN */}
        <div className="md:col-span-2 flex flex-col gap-8">
          {/* Avatar */}
          <div className="flex justify-center">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Profile picture"}
                width={192} height={192}
                unoptimized
                className="w-48 h-48 rounded-sm object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-sm bg-dry-sage flex items-center justify-center text-5xl font-semibold text-dark-slate">
                {initials}
              </div>
            )}
          </div>

          {/* Skills */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest">Skills</h2>
              <Link href="/profile/setup" className="text-xs text-coral hover:underline">
                {skills.length > 0 ? "Edit" : "Add skills"}
              </Link>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Link
                    key={s.id}
                    href={`/skill/${s.slug}`}
                    className="text-sm bg-dry-sage text-dark-slate px-3 py-1 rounded-full hover:bg-muted-teal/30 transition-colors"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-slate/40 italic">
                No skills added yet — add some to get matched with relevant projects.
              </p>
            )}
          </section>

          {/* Social links */}
          {Object.keys(socialLinks).length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Links</h2>
              <dl className="space-y-1 text-sm">
                {(["website", "linkedin", "github", "twitter"] as const).map((key) =>
                  socialLinks[key] ? (
                    <div key={key} className="flex gap-3">
                      <dt className="text-dark-slate/50 capitalize w-16 shrink-0">{key}</dt>
                      <dd>
                        <a href={socialLinks[key]} target="_blank" rel="noopener noreferrer"
                          className="text-coral hover:underline truncate">
                          {socialLinks[key].replace(/^https?:\/\//, "")}
                        </a>
                      </dd>
                    </div>
                  ) : null
                )}
              </dl>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:col-span-3 flex flex-col gap-6">
          {/* Name + location + edit */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-dark-slate">{user.name ?? "Unnamed user"}</h1>
              <Link
                href="/profile/setup"
                className="shrink-0 text-sm font-medium px-4 py-2 rounded bg-coral text-white hover:bg-watermelon transition-colors"
              >
                Edit profile
              </Link>
            </div>
            {user.country && (
              <p className="text-dark-slate/50 text-sm mt-1">📍 {user.country}</p>
            )}
          </div>

          {/* Bio */}
          {user.bio ? (
            <p className="text-dark-slate/80 leading-relaxed">{user.bio}</p>
          ) : (
            <p className="text-dark-slate/40 italic text-sm">
              No bio yet.{" "}
              <Link href="/profile/setup" className="text-coral hover:underline">Add one →</Link>
            </p>
          )}

          {/* Visibility */}
          <p className="text-xs text-dark-slate/40">
            {user.showProfile ? "Your profile is visible to other members." : "Your profile is hidden from other members."}
          </p>

          {/* Contact */}
          <section>
            <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Contact</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-dark-slate/50">Email</dt>
              <dd>
                <a href={`mailto:${user.email}`} className="text-coral hover:underline">
                  {user.email}
                </a>
              </dd>
            </dl>
          </section>

          {/* Projects */}
          {user.projectMemberships.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-dark-slate/50 uppercase tracking-widest mb-3">Projects</h2>
              <div className="flex flex-col gap-2">
                {user.projectMemberships.map(({ project }) => (
                  <Link
                    key={project.slug}
                    href={`/projects/${project.slug}`}
                    className="flex items-start gap-3 p-3 rounded border border-muted-teal/30 hover:border-seagrass transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-slate truncate">{project.title}</p>
                      {project.description && (
                        <p className="text-xs text-dark-slate/50 line-clamp-1 mt-0.5">{project.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-dark-slate/40 capitalize shrink-0 mt-0.5">{project.status}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
