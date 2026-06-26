import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import Link from "next/link";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  title: "Bli mentor — GoodTribes.org",
  description: "Ansök om att bli mentor på GoodTribes och hjälp projekt att växa.",
};

export default async function ApplyMentorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.mentor.findUnique({
    where: { userId: session.user.id },
    select: { id: true, verified: true },
  });

  if (existing) {
    return (
      <div className="max-w-lg">
        <Link
          href="/mentors"
          className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
        >
          ← Tillbaka till mentorer
        </Link>
        <div className="p-6 border border-muted-teal/40 rounded-xl text-center">
          {existing.verified ? (
            <>
              <p className="font-semibold text-dark-slate mb-1">Du är redan en verifierad mentor.</p>
              <Link href="/mentors" className="text-sm text-coral hover:underline">
                Se mentorssidan →
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold text-dark-slate mb-1">Din ansökan är under granskning.</p>
              <p className="text-sm text-dark-slate/60">Vi återkommer när den har granskats.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/mentors"
        className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
      >
        ← Tillbaka till mentorer
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Bli mentor</h1>
        <p className="text-lg text-dark-slate/70">
          Dela din erfarenhet och hjälp projekt som vill göra skillnad att ta nästa steg.
        </p>
      </div>

      <ApplyForm />
    </div>
  );
}
