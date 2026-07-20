import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createIdeaThread } from "../actions";

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
      <form action={createIdeaThread} className="flex flex-col gap-4">
        <textarea
          name="problem"
          rows={6}
          required
          autoFocus
          placeholder="T.ex. Många äldre i mitt område är socialt isolerade och saknar digitala kunskaper för att hålla kontakt med anhöriga…"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors"
          >
            Starta idésession
          </button>
          <a href="/ideaverkstad" className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">
            Avbryt
          </a>
        </div>
      </form>
    </div>
  );
}
