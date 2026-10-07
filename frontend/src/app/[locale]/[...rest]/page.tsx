import { notFound } from "next/navigation";

// An unknown path under a locale renders [locale]/not-found.tsx (translated,
// with the site's header and footer) instead of Next's bare default 404.
export default function CatchAll() {
  notFound();
}
