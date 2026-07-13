"use client";

import { useSearchParams } from "next/navigation";

export type MessagesSection = "unread" | "channels" | "chat";

export function useMessagesSection(): MessagesSection {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  if (section === "unread" || section === "chat" || section === "channels") return section;
  return searchParams.get("project") || searchParams.get("org") ? "channels" : "chat";
}
