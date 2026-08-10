"use client";

import { usePathname } from "@/i18n/navigation";

// Same sandbox-route detection as SandboxBetaBadge.tsx.
export default function SiteHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSandbox = pathname === "/sandbox" || pathname.startsWith("/sandbox/");

  return (
    <header className={`border-b shrink-0 ${isSandbox ? "border-coral" : "border-seagrass"}`}>
      {children}
    </header>
  );
}
