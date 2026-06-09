"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  slug: string;
  isAdmin: boolean;
}

export default function WorkspaceTabNav({ slug, isAdmin }: Props) {
  const pathname = usePathname();

  const tabs = [
    { label: "Meddelanden", href: `/work/${slug}/messages` },
    { label: "Uppgifter", href: `/work/${slug}/tasks` },
    ...(isAdmin ? [{ label: "Admin", href: `/work/${slug}/admin` }] : []),
  ];

  return (
    <nav className="flex gap-1 border-b border-muted-teal mb-8">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-seagrass text-seagrass"
                : "border-transparent text-dark-slate/60 hover:text-seagrass"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
