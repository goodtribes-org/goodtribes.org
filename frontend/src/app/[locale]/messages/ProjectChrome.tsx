"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProjectSideNav from "../projects/[slug]/ProjectSideNav";
import ProjectMiniHero from "../projects/[slug]/ProjectMiniHero";

type ProjectNavInfo = { title: string; imageUrl: string | null; isOwner: boolean; isCommercial: boolean };

// Wraps /messages with the same project sidebar + mini hero shown on every other
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
      <ProjectMiniHero title={info.title} imageUrl={info.imageUrl} />
      <div className="flex flex-1 flex-col sm:flex-row pt-8 pb-12" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
        <ProjectSideNav slug={slug} isOwner={info.isOwner} isCommercial={info.isCommercial} />
        <div className="flex-1 min-w-0 px-6">{children}</div>
      </div>
    </>
  );
}
