"use client";

import { useEffect, useState, useTransition } from "react";
import { createProjectFromDream, getDreamProgress, type DreamProgress } from "../actions";

// Polls the conversation's progress (the AI updates it asynchronously after
// each reply — cheap: one small DB read, no AI call) and exposes the
// "create the project" action with its pending/error state. Shared by the
// progress bar at the top and the next-step card at the bottom.
export function useDreamSummary(roomId: string, initial: DreamProgress) {
  const [progress, setProgress] = useState(initial);
  const [summarizing, startSummarizing] = useTransition();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const id = window.setInterval(async () => {
      try {
        const next = await getDreamProgress(roomId);
        if (active) setProgress(next);
      } catch {
        // transient — try again on the next tick
      }
    }, 4000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [roomId]);

  function summarize() {
    setFailed(false);
    startSummarizing(async () => {
      try {
        await createProjectFromDream(roomId);
      } catch (e) {
        // redirect() on success surfaces as a thrown NEXT_REDIRECT — Next
        // handles it; only real errors are shown.
        if (!String((e as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) setFailed(true);
        else throw e;
      }
    });
  }

  return { progress, summarize, summarizing, failed };
}
