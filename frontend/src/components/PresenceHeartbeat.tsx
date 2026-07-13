"use client";

import { useEffect } from "react";

export default function PresenceHeartbeat() {
  useEffect(() => {
    function beat() {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    }
    beat();
    const id = setInterval(beat, 20_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
