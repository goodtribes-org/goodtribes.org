"use client";

import { useState, useEffect } from "react";

export default function PresenceDot({ userId }: { userId: string }) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    function poll() {
      fetch(`/api/presence/status?userIds=${userId}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((data: Record<string, boolean>) => setOnline(!!data[userId]))
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [userId]);

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${online ? "bg-seagrass" : "bg-dark-slate/20"}`}
      aria-hidden="true"
    />
  );
}
