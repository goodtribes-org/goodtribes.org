"use client";

// The conversation panel (#366): slides in from the right over whatever page
// you're on, so you can answer without leaving it. Lists every DM, group and
// channel you're in (unread first) and shows one open conversation with the
// latest messages and the regular composer. Opened by the 💬 button in the
// header, or from anywhere with openConversations(roomId?).
// The full chat (threads, reactions, files) stays at /messages.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { renderBody } from "@/lib/renderBody";
import { MessageComposer } from "@/app/[locale]/messages/[roomId]/MessageComposer";
import type { ConversationItem } from "@/lib/conversations";

const OPEN_EVENT = "gt:conversations:open";
export const CONVERSATIONS_CHANGED_EVENT = "gt:conversations:changed";

/** Open the panel, optionally straight on one conversation. */
export function openConversations(roomId?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { roomId } }));
}

type Room = {
  roomId: string;
  title: string;
  context: string | null;
  canPost: boolean;
  projectId: string | null;
  organisationId: string | null;
  messages: { id: string; body: string; createdAt: string; mine: boolean; author: { name: string | null; image: string | null } | null }[];
};

// A message that is only an attachment has an empty body: say so instead of an empty bubble.
const isBlank = (html: string) => html.replace(/<[^>]*>/g, "").trim() === "";

function Avatar({ name, image, size = 36, channel }: { name: string | null; image?: string | null; size?: number; channel?: boolean }) {
  if (image) return <img src={image} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: channel ? "#408147" : "#12486C" }}
      aria-hidden="true"
    >
      {channel ? "#" : (name?.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export default function ConversationsPanel() {
  const t = useTranslations("Conversations");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ConversationItem[] | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [failed, setFailed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const timeFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

  const loadList = useCallback(() => {
    fetch("/api/me/conversations")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setList(d.items ?? []))
      .catch(() => setList([]));
  }, []);

  const loadRoom = useCallback((id: string) => {
    setFailed(false);
    fetch(`/api/me/conversations/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Room) => {
        setRoom(d);
        // Opening marks it read: refresh the list and the 💬 badge.
        setList((prev) => prev?.map((i) => (i.roomId === id ? { ...i, unread: false } : i)) ?? prev);
        window.dispatchEvent(new Event(CONVERSATIONS_CHANGED_EVENT));
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    function onOpen(e: Event) {
      const id = (e as CustomEvent<{ roomId?: string }>).detail?.roomId ?? null;
      setOpen(true);
      setRoomId(id);
      setRoom(null);
      loadList();
      if (id) loadRoom(id);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [loadList, loadRoom]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Navigating elsewhere (e.g. a link inside a message) closes the panel.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [room]);

  function pick(id: string) {
    setRoomId(id);
    setRoom(null);
    loadRoom(id);
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-[60] bg-black/10 md:bg-transparent" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside
        role="dialog"
        aria-label={t("title")}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[61] flex w-full flex-col border-l border-[#E4E4DF] bg-white text-dark-slate shadow-2xl transition-transform duration-200 sm:w-[400px] ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <header className="flex items-center gap-2 border-b border-[#E4E4DF] px-4 py-3">
          {roomId && (
            <button type="button" onClick={() => { setRoomId(null); setRoom(null); loadList(); }} className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5" aria-label={t("back")}>
              ←
            </button>
          )}
          <p className="m-0 min-w-0 flex-1 truncate font-bold">
            {roomId ? (room?.title ?? t("loading")) : t("title")}
            {roomId && room?.context && <span className="ml-2 text-xs font-normal text-dark-slate/60">{room.context}</span>}
          </p>
          <Link href="/my-goodtribes" onClick={() => setOpen(false)} className="shrink-0 text-xs font-semibold text-[#C2410C] hover:underline">
            {t("myPage")}
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-black/5" aria-label={t("close")}>
            ✕
          </button>
        </header>

        {/* Who you talk to, side by side — one tap between conversations */}
        {list && list.length > 0 && (
          <nav className="flex gap-3 overflow-x-auto border-b border-[#E4E4DF] px-4 py-3" style={{ scrollbarWidth: "none" }} aria-label={t("title")}>
            {list.map((c) => (
              <button key={c.roomId} type="button" onClick={() => pick(c.roomId)} className="flex w-14 shrink-0 flex-col items-center gap-1 text-[11px]">
                <span className="relative rounded-full" style={c.roomId === roomId ? { outline: "2px solid #253331", outlineOffset: 2 } : undefined}>
                  <Avatar name={c.title} image={c.image} size={40} channel={c.kind === "channel"} />
                  {c.unread && c.roomId !== roomId && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#E8531F] ring-2 ring-white" />}
                </span>
                <span className={`w-full truncate text-center ${c.roomId === roomId ? "font-bold text-dark-slate" : "text-dark-slate/60"}`}>{c.title}</span>
              </button>
            ))}
          </nav>
        )}

        {!roomId ? (
          <div className="flex-1 overflow-y-auto p-2">
            {!list ? (
              <p className="m-0 p-3 text-sm text-dark-slate/60">{t("loading")}</p>
            ) : list.length === 0 ? (
              <p className="m-0 p-3 text-sm text-dark-slate/60">{t("empty")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {list.map((c) => (
                  <li key={c.roomId}>
                    <button type="button" onClick={() => pick(c.roomId)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[#F6F6F3] ${c.unread ? "bg-[#FDEEE7]/60" : ""}`}>
                      <Avatar name={c.title} image={c.image} channel={c.kind === "channel"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-semibold"}`}>{c.title}</span>
                          {c.context && <span className="truncate text-xs text-dark-slate/50">{c.context}</span>}
                        </span>
                        <span className="block truncate text-xs text-dark-slate/60">{c.preview ?? t("noMessages")}</span>
                      </span>
                      {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#E8531F]" aria-label={t("unread")} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {failed ? (
                <p className="m-0 text-dark-slate/60">{t("loadError")}</p>
              ) : !room ? (
                <p className="m-0 text-dark-slate/60">{t("loading")}</p>
              ) : room.messages.length === 0 ? (
                <p className="m-0 text-dark-slate/60">{t("noMessages")}</p>
              ) : (
                room.messages.map((m) =>
                  m.mine ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%]">
                        <div className="rounded-2xl rounded-br-sm bg-[#12486C] px-3 py-2 text-white [&_a]:text-white [&_a]:underline [&_p]:m-0">{isBlank(m.body) ? t("attachment") : renderBody(m.body)}</div>
                        <p className="mt-1 text-right text-[11px] text-dark-slate/50">{timeFmt.format(new Date(m.createdAt))}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-end gap-2">
                      <Avatar name={m.author?.name ?? null} image={m.author?.image} size={28} />
                      <div className="max-w-[85%]">
                        <div className="rounded-2xl rounded-bl-sm bg-[#F3F1EC] px-3 py-2 [&_p]:m-0">{isBlank(m.body) ? t("attachment") : renderBody(m.body)}</div>
                        <p className="mt-1 text-[11px] text-dark-slate/50">{m.author?.name ?? "?"} · {timeFmt.format(new Date(m.createdAt))}</p>
                      </div>
                    </div>
                  ),
                )
              )}
              <div ref={endRef} />
            </div>
            <footer className="border-t border-[#E4E4DF] p-3">
              {room?.canPost ? (
                <MessageComposer roomId={room.roomId} projectId={room.projectId} organisationId={room.organisationId} onSent={() => loadRoom(room.roomId)} />
              ) : room ? (
                <p className="m-0 text-xs text-dark-slate/60">{t("readOnly")}</p>
              ) : null}
              <Link href={`/messages/${roomId}`} onClick={() => setOpen(false)} className="mt-2 block text-center text-xs font-semibold text-[#C2410C] hover:underline">
                {t("openInMessages")}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
