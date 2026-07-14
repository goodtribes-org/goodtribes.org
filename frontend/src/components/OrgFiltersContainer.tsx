"use client";

import { useRouter } from "next/navigation";
import OrgFilters from "./OrgFilters";

interface Props {
  q?: string;
  category?: string;
  skill?: string;
  skills: { slug: string; name: string }[];
  basePath?: string;
}

export default function OrgFiltersContainer(props: Props) {
  const router = useRouter();
  return <OrgFilters {...props} onNavigate={(url) => router.push(url)} />;
}
