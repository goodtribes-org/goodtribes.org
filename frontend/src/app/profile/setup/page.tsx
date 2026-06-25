import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import ProfileSetupForm from "./ProfileSetupForm";

const prisma = new PrismaClient();

export default async function ProfileSetupPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: {
      id: true,
      name: true,
      bio: true,
      country: true,
      socialLinks: true,
      showProfile: true,
      image: true,
      skills: { select: { skillId: true } },
    },
  });

  const [allSkills] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ tag: "asc" }, { name: "asc" }] }),
  ]);

  const social = (user?.socialLinks ?? {}) as Record<string, string>;
  const currentSkillIds = (user?.skills ?? []).map((us) => us.skillId);

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">
        {session.user?.onboarded ? "Edit profile" : "Welcome!"}
      </h1>
      <p className="text-dark-slate/70 mb-8">
        {session.user?.onboarded
          ? "Update your details below."
          : "Tell us a little about yourself to get started."}
      </p>

      <ProfileSetupForm
        name={user?.name ?? ""}
        bio={user?.bio ?? ""}
        country={user?.country ?? ""}
        social={social}
        showProfile={user?.showProfile ?? false}
        image={user?.image ?? null}
        isOnboarded={session.user?.onboarded ?? false}
        allSkills={allSkills}
        currentSkillIds={currentSkillIds}
      />
    </div>
  );
}
