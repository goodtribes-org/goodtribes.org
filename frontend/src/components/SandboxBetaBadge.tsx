"use client";

import { usePathname } from "@/i18n/navigation";

export default function SandboxBetaBadge() {
  const pathname = usePathname();
  if (pathname !== "/sandbox" && !pathname.startsWith("/sandbox/")) return null;

  return (
    <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-seagrass border border-seagrass/40 rounded-full px-2 py-0.5">
      Beta
    </span>
  );
}
