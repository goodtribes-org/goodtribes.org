"use client";

import { useSandboxIndicator } from "./SandboxIndicator";

export default function SiteFooter({ children }: { children: React.ReactNode }) {
  const isSandbox = useSandboxIndicator();

  return (
    <footer className={`border-t bg-dry-sage/25 shrink-0 ${isSandbox ? "border-[#b3450c]" : "border-seagrass"}`}>
      {children}
    </footer>
  );
}
