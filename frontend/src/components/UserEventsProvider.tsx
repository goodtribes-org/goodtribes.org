"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Owns ONE shared EventSource to /api/user/sse for the whole app — consumers
// (NotificationBell, MessagesLink, MessagesSidebar) each attach their own
// addEventListener to the shared instance in their own effect, exactly like
// RoomShell/KanbanBoard already do for their dedicated connections. This
// component only manages the connection's lifecycle, not event state.
const UserEventsContext = createContext<EventSource | null>(null);

export function useUserEvents(): EventSource | null {
  return useContext(UserEventsContext);
}

export default function UserEventsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [source, setSource] = useState<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource("/api/user/sse");
    es.addEventListener("close", () => es.close());
    setSource(es);
    return () => {
      es.close();
      setSource(null);
    };
  }, [enabled]);

  return <UserEventsContext.Provider value={source}>{children}</UserEventsContext.Provider>;
}
