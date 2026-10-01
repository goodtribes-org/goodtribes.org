"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ShareButton from "@/components/ShareButton";

// The site header's share icon: the existing ShareButton menu (copy link,
// LinkedIn, X, …) for whatever page the visitor is on right now.
export default function HeaderShareButton() {
  const pathname = usePathname();
  const [page, setPage] = useState({ url: "", title: "" });

  // Read after navigation, so the link and title follow client-side page changes.
  useEffect(() => {
    setPage({ url: window.location.href, title: document.title });
  }, [pathname]);

  return <ShareButton url={page.url} title={page.title} variant="header" />;
}
