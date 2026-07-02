"use client";

import { useTransition } from "react";
import { updateForumPostStatus } from "../actions";

export default function StatusActions({
  postId,
  currentStatus,
  projectSlug,
}: {
  postId: string;
  currentStatus: string;
  projectSlug: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatus(status: string) {
    startTransition(async () => {
      await updateForumPostStatus(postId, status, projectSlug);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-dark-slate/50">Markera som:</span>
      {currentStatus !== "resolved" && (
        <button
          onClick={() => handleStatus("resolved")}
          disabled={isPending}
          className="text-xs px-3 py-1 rounded-full border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          Löst
        </button>
      )}
      {currentStatus !== "decided" && (
        <button
          onClick={() => handleStatus("decided")}
          disabled={isPending}
          className="text-xs px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
        >
          Beslutad
        </button>
      )}
      {currentStatus !== "open" && (
        <button
          onClick={() => handleStatus("open")}
          disabled={isPending}
          className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Öppen
        </button>
      )}
    </div>
  );
}
