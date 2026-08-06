"use client";

import { useState, useTransition } from "react";
import { addComment } from "./actions";

export type CommentNode = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
  parentId: string | null;
  replies: CommentNode[];
};

function CommentItem({
  projectSlug,
  contributionId,
  comment,
  canWrite,
  depth,
}: {
  projectSlug: string;
  contributionId: string;
  comment: CommentNode;
  canWrite: boolean;
  depth: number;
}) {
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitReply() {
    if (!body.trim()) return;
    startTransition(async () => {
      await addComment(projectSlug, contributionId, body, comment.id);
      setBody("");
      setReplying(false);
    });
  }

  return (
    <div className={depth > 0 ? "ml-5 mt-2 border-l border-muted-teal/20 pl-3" : "mt-2"}>
      <p className="text-xs text-dark-slate/40">{comment.authorName ?? "Okänd"}</p>
      <p className="text-sm text-dark-slate/80">{comment.body}</p>
      {canWrite && (
        <button
          type="button"
          onClick={() => setReplying((v) => !v)}
          className="text-xs text-seagrass hover:underline mt-0.5"
        >
          Svara
        </button>
      )}
      {replying && (
        <div className="flex gap-2 mt-1.5">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Skriv ett svar…"
            className="flex-1 border border-muted-teal rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            type="button"
            disabled={isPending || !body.trim()}
            onClick={submitReply}
            className="text-xs font-medium text-white bg-seagrass rounded-md px-3 py-1 disabled:opacity-60"
          >
            Skicka
          </button>
        </div>
      )}
      {comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          projectSlug={projectSlug}
          contributionId={contributionId}
          comment={reply}
          canWrite={canWrite}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function CommentThread({
  projectSlug,
  contributionId,
  comments,
  canWrite,
}: {
  projectSlug: string;
  contributionId: string;
  comments: CommentNode[];
  canWrite: boolean;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  function submitTopLevel() {
    if (!body.trim()) return;
    startTransition(async () => {
      await addComment(projectSlug, contributionId, body);
      setBody("");
    });
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-dark-slate/50 hover:text-seagrass">
        {expanded ? "Dölj kommentarer" : `Kommentarer (${comments.length})`}
      </button>
      {expanded && (
        <div className="mt-1">
          {comments.map((c) => (
            <CommentItem key={c.id} projectSlug={projectSlug} contributionId={contributionId} comment={c} canWrite={canWrite} depth={0} />
          ))}
          {canWrite && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Skriv en kommentar…"
                className="flex-1 border border-muted-teal rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <button
                type="button"
                disabled={isPending || !body.trim()}
                onClick={submitTopLevel}
                className="text-xs font-medium text-white bg-seagrass rounded-md px-3 py-1 disabled:opacity-60"
              >
                Skicka
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
