import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewIdeaThreadForm from "./NewIdeaThreadForm";

export const metadata: Metadata = {
  title: "Ny idésession — Idéverkstaden",
};

export default async function NewIdeaThreadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-slate mb-1">Vilket problem vill du lösa?</h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        Beskriv problemet i fritext. Andra kan sedan kommentera och bidra — och du kan när som helst skriva
        @AI för att bjuda in AI som deltagare i tråden.
      </p>
      <NewIdeaThreadForm />
    </div>
  );
}
