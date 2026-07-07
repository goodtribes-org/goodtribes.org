"use client";

import { useEffect } from "react";

export default function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-coral", "ring-offset-2", "rounded-lg");
    const timeout = setTimeout(() => {
      el.classList.remove("ring-2", "ring-coral", "ring-offset-2", "rounded-lg");
    }, 2500);
    return () => clearTimeout(timeout);
  }, []);

  return null;
}
