"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { proposePartnership } from "@/lib/actions/partnerships";

export default function ProposeMatchButton({
  side,
  organisationSlug,
  projectSlug,
}: {
  side: "org" | "project";
  organisationSlug: string;
  projectSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function propose() {
    startTransition(async () => {
      await proposePartnership(side, organisationSlug, projectSlug, "partner", null);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={propose}
      className="text-xs font-medium text-seagrass border border-seagrass/40 hover:border-seagrass hover:bg-seagrass/5 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
    >
      {isPending ? "Skickar..." : "Föreslå partnerskap"}
    </button>
  );
}
