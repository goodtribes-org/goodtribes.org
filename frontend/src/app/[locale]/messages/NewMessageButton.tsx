"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { openDirectMessage, searchUsersForDm } from "./actions";

type UserResult = { id: string; name: string | null; image: string | null };

function initialsOf(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function NewMessageButton() {
  const t = useTranslations("Messages");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rendered via a document.body portal (like ReactionBar's emoji picker) so
  // it can't be clipped by the sidebar's overflow-y-auto — an ancestor with
  // overflow set on one axis forces the other axis to "auto" too, which was
  // silently clipping this popover when it was a plain absolutely-positioned
  // child instead.
  function openPopover() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 256;
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setPopoverStyle({ position: "fixed", top: rect.bottom + 4, left, width, zIndex: 9999 });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      searchUsersForDm(q).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  function selectUser(userId: string) {
    startTransition(async () => {
      const { roomId } = await openDirectMessage(userId);
      setOpen(false);
      setQuery("");
      setResults([]);
      router.push(`/messages/${roomId}?section=chat`);
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPopover}
        title={t("newMessage")}
        aria-label={t("newMessage")}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-dark-slate/60 hover:text-seagrass hover:bg-dry-sage/20 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div ref={popoverRef} style={popoverStyle} className="bg-white border border-muted-teal/20 rounded-xl shadow-lg p-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPeople")}
            className="w-full text-sm border border-muted-teal/30 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
          />
          <div className="mt-1 max-h-64 overflow-y-auto">
            {query.trim() && results.length === 0 && (
              <p className="px-2 py-2 text-xs text-dark-slate/40 italic">{t("noResults")}</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={isPending}
                onClick={() => selectUser(u.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-dry-sage/20 transition-colors disabled:opacity-50"
              >
                <span className="w-7 h-7 rounded-full bg-dry-sage flex items-center justify-center text-[10px] font-semibold text-dark-slate shrink-0 overflow-hidden relative">
                  {u.image ? (
                    <Image src={u.image} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    initialsOf(u.name)
                  )}
                </span>
                <span className="truncate text-dark-slate">{u.name ?? "?"}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
