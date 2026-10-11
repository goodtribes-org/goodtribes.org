"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { dismissCallMatch } from "./actions";

export type CallMatchRow = { id: string; slug: string; title: string; funder: string; closes: string; reasons: string[] };

// Utlysningar (#345): published calls that fit this project, with why.
export default function CallMatches({ matches, projectSlug, canManage }: { matches: CallMatchRow[]; projectSlug: string; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <div key={m.id} className="rounded-lg border border-seagrass/30 bg-seagrass/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{m.funder} · {m.closes}</p>
          <Link href={`/utlysningar/${m.slug}`} className="mt-0.5 block font-medium text-dark-slate hover:underline">{m.title}</Link>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-dark-slate/70">
            {m.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <Link href={`/utlysningar/${m.slug}`} className="rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-watermelon">
              Läs utlysningen
            </Link>
            {canManage && (
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => { await dismissCallMatch(m.id, projectSlug); router.refresh(); })}
                className="text-xs font-medium text-dark-slate/40 hover:text-dark-slate disabled:opacity-50"
              >
                Passar inte
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
