"use client";

import { useState, useTransition } from "react";
import { createChannel } from "../actions";
import type { ChannelRow } from "./KanalerShell";

type Props = {
  slug: string;
  projectId: string;
  channels: ChannelRow[];
  activeChannelId: string;
  unreadMap: Record<string, number>;
  isAdmin: boolean;
  onSelect: (channelId: string) => void;
};

export function ChannelSidebar({
  slug,
  projectId,
  channels,
  activeChannelId,
  unreadMap,
  isAdmin,
  onSelect,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      await createChannel(projectId, slug, newName.trim());
      setNewName("");
      setShowForm(false);
    });
  }

  return (
    <div className="flex flex-col h-full bg-dry-sage/10">
      <div className="px-3 py-3 text-xs font-bold text-dark-slate/50 uppercase tracking-widest border-b border-muted-teal/20">
        Kanaler
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {channels.map((c) => {
          const isActive = c.id === activeChannelId;
          const unread = unreadMap[c.id] ?? 0;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mx-1 my-0.5 text-left transition-colors ${
                isActive
                  ? "bg-seagrass/20 text-seagrass font-semibold border-l-4 border-seagrass pl-2"
                  : "text-dark-slate/70 hover:bg-muted-teal/10 hover:text-dark-slate"
              }`}
            >
              <span className="text-dark-slate/40 text-xs">#</span>
              <span className="flex-1 truncate">{c.name}</span>
              {!isActive && unread > 0 && (
                <span className="w-2 h-2 rounded-full bg-coral shrink-0" />
              )}
              {c.pinned && (
                <span className="text-[10px] text-dark-slate/30">📌</span>
              )}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="border-t border-muted-teal/20 p-2">
          {showForm ? (
            <form onSubmit={handleCreate} className="flex gap-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="kanal-namn"
                className="flex-1 text-xs border border-muted-teal/40 rounded px-2 py-1 focus:outline-none focus:border-seagrass"
                autoFocus
                maxLength={40}
              />
              <button
                type="submit"
                disabled={isPending}
                className="text-xs px-2 py-1 bg-seagrass text-white rounded hover:bg-seagrass/80 disabled:opacity-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs px-2 py-1 text-dark-slate/50 hover:text-dark-slate"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full text-xs text-dark-slate/40 hover:text-dark-slate flex items-center gap-1 px-2 py-1 rounded hover:bg-muted-teal/10 transition-colors"
            >
              <span>+</span> Ny kanal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
