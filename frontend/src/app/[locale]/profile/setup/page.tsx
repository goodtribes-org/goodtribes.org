import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { getTranslations } from "next-intl/server";
import ProfileSetupForm from "./ProfileSetupForm";
import type { Locale } from "next-intl";


export default async function ProfileSetupPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ProfileSetupPage" }),
  ]);
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
      availability: true,
      interests: true,
      skills: { select: { skillId: true } },
    },
  });

  const [allSkills] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ tag: "asc" }, { name: "asc" }] }),
  ]);

  const social = (user?.socialLinks ?? {}) as Record<string, string>;
  const currentSkillIds = (user?.skills ?? []).map((us) => us.skillId);
  const currentInterests = (user?.interests ?? []) as number[];

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">
        {session.user?.onboardingDone ? t("editHeading") : t("welcomeHeading")}
      </h1>
      <p className="text-dark-slate/70 mb-8">
        {session.user?.onboardingDone ? t("editIntro") : t("welcomeIntro")}
      </p>

      <ProfileSetupForm
        name={user?.name ?? ""}
        bio={user?.bio ?? ""}
        country={user?.country ?? ""}
        social={social}
        showProfile={user?.showProfile ?? false}
        image={user?.image ?? null}
        isOnboarded={session.user?.onboardingDone ?? false}
        allSkills={allSkills}
        currentSkillIds={currentSkillIds}
        availability={user?.availability ?? null}
        currentInterests={currentInterests}
      />
    </div>
  );
}
