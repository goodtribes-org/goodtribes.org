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
    <div className="flex flex-col h-full bg-dark-slate">
      <div className="px-4 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-widest border-b border-white/10">
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
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md mx-1 my-0.5 text-left transition-colors ${
                isActive
                  ? "bg-white/20 text-white font-semibold"
                  : unread > 0
                  ? "text-white font-semibold hover:bg-white/10"
                  : "text-white/60 hover:bg-white/10 hover:text-white/90"
              }`}
            >
              <span className="text-white/30 text-xs font-normal">#</span>
              <span className="flex-1 truncate">{c.name}</span>
              {!isActive && unread > 0 && (
                <span className="bg-coral text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {c.pinned && (
                <span className="text-[10px] text-white/20">📌</span>
              )}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="border-t border-white/10 p-2">
          {showForm ? (
            <form onSubmit={handleCreate} className="flex gap-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="kanal-namn"
                className="flex-1 text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white placeholder-white/30 focus:outline-none focus:border-white/40"
                autoFocus
                maxLength={40}
              />
              <button
                type="submit"
                disabled={isPending}
                className="text-xs px-2 py-1 bg-white/20 text-white rounded hover:bg-white/30 disabled:opacity-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs px-2 py-1 text-white/40 hover:text-white"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full text-xs text-white/40 hover:text-white/80 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <span>+</span> Ny kanal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
