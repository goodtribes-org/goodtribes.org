"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "@/i18n/navigation";

// Drives the sandbox-colored border on SiteHeader/SiteFooter (and the mini
// hero peek). Defaults to the /sandbox route check (for the Sandbox browse
// pages themselves), but a project page overrides it with the actual
// project.isSandbox flag via ProjectSandboxAnnouncer below — project pages
// aren't served under /sandbox/ even when the project itself is a sandbox one.
const SandboxContext = createContext<{
  isSandbox: boolean;
  setProjectSandbox: (value: boolean | null) => void;
}>({ isSandbox: false, setProjectSandbox: () => {} });

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathIsSandbox = pathname === "/sandbox" || pathname.startsWith("/sandbox/");
  const [projectSandbox, setProjectSandbox] = useState<boolean | null>(null);
  const value = useMemo(
    () => ({ isSandbox: projectSandbox ?? pathIsSandbox, setProjectSandbox }),
    [projectSandbox, pathIsSandbox]
  );
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandboxIndicator() {
  return useContext(SandboxContext).isSandbox;
}

// Rendered once by a project page/layout so the header/footer border matches
// this project's actual isSandbox flag instead of falling back to the
// path-based guess. Clears back to the path-based default on unmount.
export function ProjectSandboxAnnouncer({ isSandbox }: { isSandbox: boolean }) {
  const { setProjectSandbox } = useContext(SandboxContext);
  useEffect(() => {
    setProjectSandbox(isSandbox);
    return () => setProjectSandbox(null);
  }, [isSandbox, setProjectSandbox]);
  return null;
}
