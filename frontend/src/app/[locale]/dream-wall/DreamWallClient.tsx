"use client";

import { useRef, useState, useTransition } from "react";
import { postDream } from "./actions";

const REACTION_EMOJIS = ["❤️", "🙌", "🚀", "💡"];

// ── Post Dream Form ────────────────────────────────────────────────────────────

export function PostDreamForm() {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const MAX = 200;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX) return;

    const fd = new FormData();
    fd.set("dreamText", trimmed);

    startTransition(async () => {
      await postDream(fd);
      setText("");
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-white border border-muted-teal/40 rounded-xl p-5 shadow-sm"
    >
      <label
        htmlFor="dreamText"
        className="block text-sm font-semibold text-dark-slate mb-2"
      >
        Din dröm — en mening
      </label>
      <textarea
        id="dreamText"
        name="dreamText"
        rows={2}
        maxLength={MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Jag drömmer om en värld där..."
        className="w-full resize-none rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate placeholder:text-dark-slate/30 focus:outline-none focus:ring-2 focus:ring-muted-teal/50 transition"
      />
      <div className="flex items-center justify-between mt-2">
        <span
          className={`text-xs tabular-nums ${
            text.length > MAX - 20 ? "text-coral" : "text-dark-slate/40"
          }`}
        >
          {text.length}/{MAX}
        </span>
        <button
          type="submit"
          disabled={isPending || text.trim().length === 0}
          className="px-4 py-1.5 rounded-lg bg-coral text-white text-sm font-medium hover:bg-coral/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Postar..." : "Dela din dröm"}
        </button>
      </div>
    </form>
  );
}

// ── Reaction Buttons ───────────────────────────────────────────────────────────

type Reaction = {
  emoji: string;
  userId: string;
};

interface ReactionButtonsProps {
  dreamWallPostId: string;
  initialReactions: Reaction[];
  currentUserId: string | null;
}

export function ReactionButtons({
  dreamWallPostId,
  initialReactions,
  currentUserId,
}: ReactionButtonsProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [pending, setPending] = useState<string | null>(null);

  async function handleReact(emoji: string) {
    if (!currentUserId || pending) return;
    setPending(emoji);

    try {
      const res = await fetch("/api/dream-wall/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamWallPostId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions as Reaction[]);
      }
    } finally {
      setPending(null);
    }
  }

  function countFor(emoji: string) {
    return reactions.filter((r) => r.emoji === emoji).length;
  }

  function hasReacted(emoji: string) {
    return currentUserId
      ? reactions.some((r) => r.emoji === emoji && r.userId === currentUserId)
      : false;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const count = countFor(emoji);
        const reacted = hasReacted(emoji);
        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={!currentUserId || pending === emoji}
            aria-label={`Reagera med ${emoji}`}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-all ${
              reacted
                ? "border-muted-teal bg-muted-teal/10 text-dark-slate font-medium"
                : "border-transparent bg-slate-100 text-dark-slate/60 hover:bg-muted-teal/10 hover:border-muted-teal/30"
            } disabled:cursor-not-allowed`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="text-xs tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
