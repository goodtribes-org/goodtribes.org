"use client";

import { usePathname } from "next/navigation";
import WorkspaceTabNav from "./WorkspaceTabNav";

export default function WorkspaceTabNavContainer(props: { slug: string; isAdmin: boolean }) {
  const pathname = usePathname();
  return <WorkspaceTabNav {...props} pathname={pathname} />;
}
