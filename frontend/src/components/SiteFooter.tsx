"use client";

import { usePathname } from "@/i18n/navigation";

// Same sandbox-route detection as SiteHeader.tsx / SandboxBetaBadge.tsx.
export default function SiteFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSandbox = pathname === "/sandbox" || pathname.startsWith("/sandbox/");

  return (
    <footer className={`border-t bg-dry-sage/25 shrink-0 ${isSandbox ? "border-coral" : "border-seagrass"}`}>
      {children}
    </footer>
  );
}
