"use client";

import { useTransition } from "react";
import { approveTimeLog, rejectTimeLog } from "./actions";

interface Props {
  timeLogId: string;
  projectSlug: string;
}

export default function ApprovalButtons({ timeLogId, projectSlug }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveTimeLog(timeLogId, projectSlug);
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectTimeLog(timeLogId, projectSlug);
    });
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="px-3 py-1 text-xs font-medium bg-seagrass text-white rounded hover:bg-seagrass/80 transition-colors disabled:opacity-50"
      >
        Godkänn
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="px-3 py-1 text-xs font-medium border border-coral text-coral rounded hover:bg-coral/10 transition-colors disabled:opacity-50"
      >
        Avvisa
      </button>
    </div>
  );
}
