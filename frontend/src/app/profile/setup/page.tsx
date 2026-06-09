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
    select: { name: true, bio: true, socialLinks: true, showProfile: true, image: true },
  });

  const social = (user?.socialLinks ?? {}) as Record<string, string>;

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">
        {session.user?.onboarded ? "Redigera profil" : "Välkommen!"}
      </h1>
      <p className="text-dark-slate/70 mb-8">
        {session.user?.onboarded
          ? "Uppdatera dina uppgifter nedan."
          : "Berätta lite om dig själv för att komma igång."}
      </p>

      <ProfileSetupForm
        name={user?.name ?? ""}
        bio={user?.bio ?? ""}
        social={social}
        showProfile={user?.showProfile ?? false}
        image={user?.image ?? null}
        isOnboarded={session.user?.onboarded ?? false}
      />
    </div>
  );
}
