"use client";

import { useTranslations } from "next-intl";

interface Props {
  slug: string;
  isAdmin: boolean;
  pathname: string;
}

export default function WorkspaceTabNav({ slug, isAdmin, pathname }: Props) {
  const t = useTranslations("WorkspaceTabNav");
  const tabs = [
    { label: t("messages"), href: `/messages?org=${slug}`, active: pathname.startsWith("/messages") },
    { label: t("tasks"), href: `/work/${slug}/tasks`, active: pathname.startsWith(`/work/${slug}/tasks`) },
    ...(isAdmin ? [{ label: t("admin"), href: `/work/${slug}/admin`, active: pathname.startsWith(`/work/${slug}/admin`) }] : []),
  ];

  return (
    <nav className="flex gap-1 border-b border-muted-teal mb-8">
      {tabs.map((tab) => {
        const active = tab.active;
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-seagrass text-seagrass"
                : "border-transparent text-dark-slate/60 hover:text-seagrass"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
