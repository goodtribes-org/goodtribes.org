"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToPartnership, revokePartnership } from "@/lib/actions/partnerships";

export default function PartnershipActions({
  partnershipId,
  mode,
}: {
  partnershipId: string;
  mode: "respond" | "revoke";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(decision: "active" | "declined") {
    startTransition(async () => {
      await respondToPartnership(partnershipId, decision);
      router.refresh();
    });
  }

  function revoke() {
    startTransition(async () => {
      await revokePartnership(partnershipId);
      router.refresh();
    });
  }

  if (mode === "revoke") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={revoke}
        className="text-xs font-medium text-dark-slate/50 hover:text-red-600 disabled:opacity-50"
      >
        Återkalla
      </button>
    );
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      <button
        type="button"
        disabled={isPending}
        onClick={() => respond("active")}
        className="text-xs font-medium text-white bg-seagrass hover:opacity-90 px-3 py-1.5 rounded disabled:opacity-50"
      >
        Godkänn
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => respond("declined")}
        className="text-xs font-medium text-dark-slate/70 border border-muted-teal/40 hover:border-dark-slate/40 px-3 py-1.5 rounded disabled:opacity-50"
      >
        Avvisa
      </button>
    </div>
  );
}
