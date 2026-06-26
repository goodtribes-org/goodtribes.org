"use client";

import { useTransition } from "react";
import { closePoll } from "../actions";

interface Props {
  pollId: string;
  projectSlug: string;
}

export default function CloseButton({ pollId, projectSlug }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!confirm("Är du säker på att du vill stänga omröstningen?")) return;
    startTransition(async () => {
      await closePoll(pollId, projectSlug);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={isPending}
      className="text-xs text-dark-slate/50 hover:text-watermelon transition-colors disabled:opacity-60"
    >
      {isPending ? "Stänger…" : "Stäng omröstning"}
    </button>
  );
}
