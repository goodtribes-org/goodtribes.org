"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// While the AI is still filling in sections, refresh the server-rendered
// page every few seconds so they appear as they finish. Stops by itself:
// once nothing is in progress the page renders without this component.
export default function FillPoller() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
