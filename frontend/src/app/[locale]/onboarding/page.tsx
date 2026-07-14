import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import OnboardingWizard from "./OnboardingWizard";


export const metadata = { title: "Kom igång – GoodTribes" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true },
  });

  if (user?.onboardingDone) redirect("/workplace");

  return (
    <main className="min-h-screen bg-warm-white py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-dark-slate mb-2">
            Vad vill du göra?
          </h1>
          <p className="text-dark-slate/60">
            En sista fråga — sedan är du redo att göra skillnad.
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </main>
  );
}
