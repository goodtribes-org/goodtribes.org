"use client";

import { useRouter } from "next/navigation";
import ProjectFilters from "./ProjectFilters";

interface Props {
  sort: string;
  q?: string;
  phase?: string;
  category?: string;
  sdg?: string;
  basePath?: string;
}

export default function ProjectFiltersContainer(props: Props) {
  const router = useRouter();
  return <ProjectFilters {...props} onNavigate={(url) => router.push(url)} />;
}
