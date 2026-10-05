"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Drives the sandbox-colored border on SiteHeader/SiteFooter (and the mini
// hero peek). Off by default; a project page turns it on with the actual
// project.isSandbox flag via ProjectSandboxAnnouncer below. (It used to also
// switch on for the /sandbox browse page, removed in #224.)
const SandboxContext = createContext<{
  isSandbox: boolean;
  setProjectSandbox: (value: boolean | null) => void;
}>({ isSandbox: false, setProjectSandbox: () => {} });

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const [projectSandbox, setProjectSandbox] = useState<boolean | null>(null);
  const value = useMemo(
    () => ({ isSandbox: projectSandbox ?? false, setProjectSandbox }),
    [projectSandbox]
  );
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

export function useSandboxIndicator() {
  return useContext(SandboxContext).isSandbox;
}

// Rendered once by a project page/layout so the header/footer border matches
// this project's actual isSandbox flag. Clears back to off on unmount.
export function ProjectSandboxAnnouncer({ isSandbox }: { isSandbox: boolean }) {
  const { setProjectSandbox } = useContext(SandboxContext);
  useEffect(() => {
    setProjectSandbox(isSandbox);
    return () => setProjectSandbox(null);
  }, [isSandbox, setProjectSandbox]);
  return null;
}
