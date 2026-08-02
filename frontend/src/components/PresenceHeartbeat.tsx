"use client";

import { useEffect } from "react";

export default function PresenceHeartbeat() {
  useEffect(() => {
    function beat() {
      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {});
    }
    function goOffline() {
      navigator.sendBeacon("/api/presence/offline");
    }
    beat();
    const id = setInterval(beat, 20_000);
    document.addEventListener("pagehide", goOffline);
    return () => {
      clearInterval(id);
      document.removeEventListener("pagehide", goOffline);
    };
  }, []);

  return null;
}
