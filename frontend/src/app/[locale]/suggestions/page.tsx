import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import SuggestionForm from "./SuggestionForm";

export const metadata: Metadata = {
  title: "Ge förslag — GoodTribes.org",
  description: "Ge förslag på förbättringar för GoodTribes",
};

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "Väntar på granskning", bg: "bg-amber-50",   text: "text-amber-700" },
  reviewed:  { label: "Granskad",             bg: "bg-green-100",  text: "text-green-700" },
  dismissed: { label: "Avfärdad",             bg: "bg-gray-100",   text: "text-gray-500" },
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just nu";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h sedan`;
  return `${Math.floor(h / 24)}d sedan`;
}

export default async function SuggestionsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const mySuggestions = userId
    ? await prisma.suggestion.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Ge förslag</h1>
        <p className="text-sm text-dark-slate/50 mt-1">
          Har du en idé för hur vi kan göra GoodTribes bättre? Berätta för oss.
        </p>
      </div>

      {userId ? (
        <SuggestionForm />
      ) : (
        <div className="rounded-xl border border-muted-teal/40 bg-white p-4 text-center">
          <p className="text-sm text-dark-slate/60">
            <Link href="/login" className="text-coral hover:underline">Logga in</Link> för att ge ett förslag.
          </p>
        </div>
      )}

      {mySuggestions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-dark-slate uppercase tracking-wider mb-3">Dina förslag</h2>
          <div className="flex flex-col gap-3">
            {mySuggestions.map((s) => {
              const status = STATUS_LABELS[s.status] ?? STATUS_LABELS.pending;
              return (
                <div key={s.id} className="rounded-xl border border-muted-teal/20 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-dark-slate/40">{timeAgo(s.createdAt)}</span>
                  </div>
                  <p className="text-sm text-dark-slate/80 leading-relaxed whitespace-pre-wrap">{s.body}</p>
                  {s.decisionNote && s.status !== "dismissed" && (
                    <p className="text-xs text-dark-slate/50 mt-2 italic">Kommentar: {s.decisionNote}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
