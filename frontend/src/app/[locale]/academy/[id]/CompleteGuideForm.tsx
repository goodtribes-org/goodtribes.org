"use client";

import { useTransition } from "react";
import { completeGuide } from "../actions";

export default function CompleteGuideForm({ guideId }: { guideId: string }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await completeGuide(guideId);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={pending}
        className="px-5 py-2.5 bg-seagrass text-white font-medium rounded-lg hover:bg-seagrass/80 transition-colors disabled:opacity-60"
      >
        {pending ? "Sparar..." : "Markera som klar"}
      </button>
    </form>
  );
}
