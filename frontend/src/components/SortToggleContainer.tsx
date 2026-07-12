"use client";

import { useRouter } from "next/navigation";
import SortToggle from "./SortToggle";

interface Props {
  sort: string;
  q?: string;
  status?: string;
  category?: string;
  sdg?: string;
  basePath?: string;
}

export default function SortToggleContainer(props: Props) {
  const router = useRouter();
  return <SortToggle {...props} onNavigate={(url) => router.push(url)} />;
}
