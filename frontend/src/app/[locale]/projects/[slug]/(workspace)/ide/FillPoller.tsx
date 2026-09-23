"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

// While the AI is still filling in sections, refresh the server-rendered
// page so they appear as they finish. Stops by itself: once nothing is in
// progress the page renders without this component.
//
// One refresh at a time: the next starts a few seconds after the previous
// one has finished. A fixed interval shorter than the page's render time
// (these overview pages run many queries) made each refresh cancel the
// one before it, so the page never updated.
export default function FillPoller() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  useEffect(() => {
    if (refreshing) return;
    const id = window.setTimeout(() => startTransition(() => router.refresh()), 3000);
    return () => window.clearTimeout(id);
  }, [refreshing, router]);
  return null;
}
