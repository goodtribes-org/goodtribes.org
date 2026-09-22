"use client";

import { useSandboxIndicator } from "./SandboxIndicator";

export default function SiteFooter({ children }: { children: React.ReactNode }) {
  const isSandbox = useSandboxIndicator();

  return (
    <footer
      className="shrink-0 bg-[#fbf8f4]"
      style={{
        borderTop: isSandbox ? "1px solid #b3450c" : "1px solid transparent",
        borderImage: isSandbox ? undefined : "linear-gradient(90deg, var(--color-coral), var(--color-seagrass), var(--color-navy)) 1",
      }}
    >
      {children}
    </footer>
  );
}
