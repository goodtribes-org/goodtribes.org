"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCallApplication } from "./actions";

// Utlysningar (#346): start the application for a call.
export default function StartCallApplication({ projectSlug, fundingCallId, label = "Börja på ansökan" }: { projectSlug: string; fundingCallId: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await startCallApplication(projectSlug, fundingCallId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Något gick fel");
            }
          })
        }
        className="rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-watermelon disabled:opacity-50"
      >
        {label}
      </button>
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </>
  );
}
