"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The big screen refreshes itself (#281): the server renders the numbers and
// the latest events, this just asks for them again every few seconds.
export default function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
