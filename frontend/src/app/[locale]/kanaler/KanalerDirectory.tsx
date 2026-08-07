"use client";

import { useState } from "react";
import Link from "next/link";

type ChannelRow = { id: string; name: string | null; pinned: boolean; unread: boolean };
type ProjectGroup = { id: string; slug: string; title: string; rooms: ChannelRow[] };
type OrgGroup = { id: string; slug: string; name: string; rooms: ChannelRow[] };

type Props = {
  projectGroups: ProjectGroup[];
  orgGroups: OrgGroup[];
};

function ChannelGroupSection({
  title,
  rooms,
  hrefFor,
}: {
  title: string;
  rooms: ChannelRow[];
  hrefFor: (roomId: string) => string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-dark-slate/50 uppercase tracking-widest mb-2">{title}</h2>
      <div className="border border-muted-teal/30 rounded-lg divide-y divide-muted-teal/20 overflow-hidden">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={hrefFor(room.id)}
            className="flex items-center gap-2 px-4 py-3 hover:bg-dry-sage/10 transition-colors"
          >
            {room.pinned && (
              <span title="Pinnad" className="text-xs">
                📌
              </span>
            )}
            <span className="text-dark-slate/30">#</span>
            <span className="flex-1 text-sm font-medium text-dark-slate truncate">{room.name ?? "Arbetsrum"}</span>
            {room.unread && <span className="w-2 h-2 rounded-full bg-seagrass shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function KanalerDirectory({ projectGroups, orgGroups }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  function matches(groupTitle: string, room: ChannelRow) {
    if (!q) return true;
    return groupTitle.toLowerCase().includes(q) || (room.name ?? "").toLowerCase().includes(q);
  }

  const filteredProjects = projectGroups
    .map((g) => ({ ...g, rooms: g.rooms.filter((r) => matches(g.title, r)) }))
    .filter((g) => g.rooms.length > 0);
  const filteredOrgs = orgGroups
    .map((g) => ({ ...g, rooms: g.rooms.filter((r) => matches(g.name, r)) }))
    .filter((g) => g.rooms.length > 0);

  const noChannelsAtAll = projectGroups.length === 0 && orgGroups.length === 0;
  const noMatches = !noChannelsAtAll && filteredProjects.length === 0 && filteredOrgs.length === 0;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök kanal eller projekt…"
        className="w-full mb-6 px-4 py-2.5 border border-muted-teal rounded-lg text-sm focus:outline-none focus:border-seagrass"
      />

      {noChannelsAtAll ? (
        <p className="text-dark-slate/50 text-center py-12">
          Du är inte med i några kanaler ännu. Kanaler skapas av projekt- och organisationsadmins.
        </p>
      ) : noMatches ? (
        <p className="text-dark-slate/50 text-center py-12">Inga kanaler matchar &quot;{query}&quot;.</p>
      ) : (
        <div className="space-y-6">
          {filteredProjects.map((group) => (
            <ChannelGroupSection
              key={group.id}
              title={group.title}
              rooms={group.rooms}
              hrefFor={(roomId) => `/messages/${roomId}?section=channels&project=${group.slug}`}
            />
          ))}
          {filteredOrgs.map((group) => (
            <ChannelGroupSection
              key={group.id}
              title={group.name}
              rooms={group.rooms}
              hrefFor={(roomId) => `/messages/${roomId}?section=channels&org=${group.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
