"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProjectTopNav from "../projects/[slug]/ProjectTopNav";
import { ProjectSandboxAnnouncer } from "@/components/SandboxIndicator";

type ProjectNavInfo = { title: string; slogan: string | null; imageUrl: string | null; isOwner: boolean; isCommercial: boolean; dateLabel: string; isSandbox: boolean };

// Wraps /messages with the same project tab bar shown on every other
// project subpage, whenever it's opened from a project's channel (?project=slug) —
// otherwise /messages has no project context and just renders children as-is.
export default function ProjectChrome({ children }: { children: React.ReactNode }) {
  const slug = useSearchParams().get("project");
  const [info, setInfo] = useState<ProjectNavInfo | null>(null);

  useEffect(() => {
    if (!slug) {
      setInfo(null);
      return;
    }
    let active = true;
    fetch(`/api/projects/${slug}/nav`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active) setInfo(data); })
      .catch(() => { if (active) setInfo(null); });
    return () => { active = false; };
  }, [slug]);

  if (!slug || !info) return <>{children}</>;

  return (
    <>
      <ProjectSandboxAnnouncer isSandbox={info.isSandbox} />
      <ProjectTopNav slug={slug} title={info.title} isOwner={info.isOwner} isCommercial={info.isCommercial} />
      {/* Full-bleed, as before the side rail was removed: pages that fill the
          width (Att göra, Färdplan, ...) keep doing so; pages with their own
          max-width still centre themselves. */}
      <div className="flex-1 min-w-0 px-6" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        {children}
      </div>
    </>
  );
}
