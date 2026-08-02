"use client";

import { useEffect, useRef, useState } from "react";

// Seeds initial state from the existing /api/presence/status endpoint, then
// opens ONE /api/presence/sse connection for live updates — shared across
// however many ids the caller passes (e.g. the whole DM sidebar list), not
// one connection per dot.
export function usePresence(userIds: string[]): Record<string, boolean> {
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const key = userIds.slice().sort().join(",");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");

    fetch(`/api/presence/status?userIds=${ids.join(",")}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, boolean>) => setStatus((prev) => ({ ...prev, ...data })))
      .catch(() => {});

    const es = new EventSource(`/api/presence/sse?userIds=${ids.join(",")}`);
    esRef.current = es;

    es.addEventListener("presence", (e) => {
      const { userId, online } = JSON.parse((e as MessageEvent).data) as { userId: string; online: boolean };
      setStatus((prev) => ({ ...prev, [userId]: online }));
    });
    es.addEventListener("close", () => es.close());

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [key]);

  return status;
}
