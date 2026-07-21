"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingInstance {
  id: string;
  region: string;
  country: string | null;
  child: { title: string; slug: string };
}

export default function InstanceReviewPanel({ instances }: { instances: PendingInstance[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(instanceId: string, decision: "approved" | "rejected") {
    setBusyId(instanceId);
    setError(null);
    try {
      const res = await fetch("/api/projects/instances/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, decision }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Något gick fel.");
      }
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded p-4 mb-8 space-y-3">
      <h2 className="text-sm font-semibold text-dark-slate">
        Väntande instansansökningar ({instances.length})
      </h2>
      {instances.map((inst) => (
        <div key={inst.id} className="flex items-center justify-between gap-3 bg-white border border-amber-200/60 rounded px-3 py-2">
          <div>
            <p className="text-sm font-medium text-dark-slate">{inst.child.title}</p>
            <p className="text-xs text-dark-slate/50">
              {inst.region}{inst.country ? `, ${inst.country}` : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={busyId === inst.id}
              onClick={() => review(inst.id, "approved")}
              className="text-xs font-medium text-white bg-seagrass hover:opacity-90 px-3 py-1.5 rounded disabled:opacity-50"
            >
              Godkänn
            </button>
            <button
              type="button"
              disabled={busyId === inst.id}
              onClick={() => review(inst.id, "rejected")}
              className="text-xs font-medium text-dark-slate/70 border border-muted-teal/40 hover:border-dark-slate/40 px-3 py-1.5 rounded disabled:opacity-50"
            >
              Avvisa
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
