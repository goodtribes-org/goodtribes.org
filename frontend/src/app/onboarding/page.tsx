import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import OnboardingWizard from "./OnboardingWizard";

const prisma = new PrismaClient();

export const metadata = { title: "Kom igång – GoodTribes" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true },
  });

  if (user?.onboardingDone) redirect("/workplace");

  // Fetch top 20 skills ordered by popularity (userCount), then name
  const skills = await prisma.skill.findMany({
    take: 20,
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, tag: true },
  });

  return (
    <main className="min-h-screen bg-warm-white py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-dark-slate mb-2">
            Välkommen till GoodTribes
          </h1>
          <p className="text-dark-slate/60">
            Tre snabba frågor — sedan är du redo att göra skillnad.
          </p>
        </div>
        <OnboardingWizard skills={skills} />
      </div>
    </main>
  );
}
