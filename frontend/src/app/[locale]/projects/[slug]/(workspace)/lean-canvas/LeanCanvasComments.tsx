"use client";

import { useRef, useState, useTransition } from "react";
import { addLeanCanvasComment, deleteLeanCanvasComment } from "./actions";
import { timeAgo } from "@/components/kanbanShared";
import FlagContentButton from "@/components/FlagContentButton";

interface CommentItem {
  id: string;
  body: string;
  createdAt: Date | string;
  author: { id: string; name: string | null };
}

interface Props {
  projectSlug: string;
  comments: CommentItem[];
  canComment: boolean;
  currentUserId: string | null;
}

export default function LeanCanvasComments({ projectSlug, comments: initialComments, canComment, currentUserId }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value.trim() ?? "";
    if (!body || !canComment) return;
    if (ref.current) ref.current.value = "";
    startTransition(async () => {
      const result = await addLeanCanvasComment(projectSlug, body);
      if (result && "comment" in result && result.comment) {
        setComments((prev) => [...prev, result.comment as CommentItem]);
      }
    });
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      const result = await deleteLeanCanvasComment(commentId);
      if (result && "ok" in result && result.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    });
  }

  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold text-dark-slate uppercase tracking-wide mb-3">
        Kommentarer{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      <div className="space-y-2 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="border border-muted-teal/30 rounded-lg bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs">
                <span className="font-semibold text-dark-slate">{c.author.name ?? "Okänd"}</span>{" "}
                <span className="text-dark-slate/40">· {timeAgo(c.createdAt)}</span>
              </p>
              {c.author.id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={pending}
                  className="text-[10px] font-medium text-dark-slate/40 hover:text-coral shrink-0 transition-colors"
                >
                  Ta bort
                </button>
              )}
            </div>
            <p className="text-xs text-dark-slate/80 whitespace-pre-wrap leading-relaxed mt-1">{c.body}</p>
            {currentUserId && <FlagContentButton targetType="LeanCanvasComment" targetId={c.id} />}
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-dark-slate/40 italic">Inga kommentarer än.</p>
        )}
      </div>

      {canComment ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={ref}
            rows={2}
            placeholder="Skriv en kommentar..."
            className="flex-1 border border-muted-teal rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="self-end bg-coral text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
          >
            Skicka
          </button>
        </form>
      ) : (
        <p className="text-xs text-dark-slate/40">
          {currentUserId ? "Bli medlem i projektet för att kommentera." : "Logga in för att kommentera."}
        </p>
      )}
    </div>
  );
}
