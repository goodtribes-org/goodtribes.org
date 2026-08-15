"use client";

import { useSandboxIndicator } from "./SandboxIndicator";

export default function SiteHeader({ children }: { children: React.ReactNode }) {
  const isSandbox = useSandboxIndicator();

  return (
    <header className={`border-b shrink-0 ${isSandbox ? "border-[#b3450c]" : "border-seagrass"}`}>
      {children}
    </header>
  );
}
