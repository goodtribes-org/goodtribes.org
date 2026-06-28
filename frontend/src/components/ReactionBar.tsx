"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

type EmojiPickerProps = {
  data: unknown;
  onEmojiSelect: (emoji: { native: string }) => void;
  locale?: string;
  theme?: string;
  previewPosition?: string;
  skinTonePosition?: string;
};

const EmojiPicker = dynamic<EmojiPickerProps>(
  () => import("@emoji-mart/react").then((m) => m.default ?? m),
  { ssr: false }
);

type Reaction = { emoji: string; userId: string };

function groupReactions(reactions: Reaction[]) {
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const arr = map.get(r.emoji) ?? [];
    arr.push(r.userId);
    map.set(r.emoji, arr);
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({ emoji, userIds }));
}

export function ReactionBar({
  reactions,
  currentUserId,
  canAdd,
  onToggle,
}: {
  reactions: Reaction[];
  currentUserId: string | null;
  canAdd: boolean;
  onToggle: (emoji: string) => Promise<void> | void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Position picker relative to the "+" button using fixed coords to escape any overflow:hidden
  function openPicker() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const pickerHeight = 420;
      const pickerWidth = 352;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      const top = spaceAbove > pickerHeight || spaceAbove > spaceBelow
        ? rect.top - pickerHeight - 4
        : rect.bottom + 4;
      const left = Math.min(rect.left, window.innerWidth - pickerWidth - 8);

      setPickerStyle({ position: "fixed", top, left, zIndex: 9999 });
    }
    setShowPicker((v) => !v);
  }

  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  function handleToggle(emoji: string) {
    if (!currentUserId) return;
    startTransition(async () => { await onToggle(emoji); });
  }

  const groups = groupReactions(reactions);

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {groups.map(({ emoji, userIds }) => {
        const mine = currentUserId ? userIds.includes(currentUserId) : false;
        return (
          <button
            key={emoji}
            type="button"
            disabled={!currentUserId || isPending}
            onClick={() => handleToggle(emoji)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              mine
                ? "bg-coral/15 border-coral/40 text-dark-slate font-medium"
                : "bg-white border-muted-teal/30 text-dark-slate/60 hover:border-muted-teal/60"
            }`}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span>{userIds.length}</span>
          </button>
        );
      })}

      {canAdd && currentUserId && (
        <>
          <button
            ref={buttonRef}
            type="button"
            onClick={openPicker}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-sm border border-dashed border-muted-teal/40 text-dark-slate/40 hover:text-dark-slate/70 hover:border-muted-teal transition-colors"
            title="Lägg till reaktion"
          >
            +
          </button>
          {showPicker && typeof document !== "undefined" && createPortal(
            <div ref={pickerRef} style={pickerStyle} className="shadow-2xl rounded-xl overflow-hidden">
              <EmojiPicker
                data={async () => {
                  const res = await import("@emoji-mart/data");
                  return res.default;
                }}
                onEmojiSelect={(e: { native: string }) => {
                  handleToggle(e.native);
                  setShowPicker(false);
                }}
                locale="sv"
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
