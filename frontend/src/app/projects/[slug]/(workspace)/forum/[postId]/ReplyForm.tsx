"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createForumReply } from "../actions";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function isEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === "";
}

export default function ReplyForm({
  postId,
  projectSlug,
}: {
  postId: string;
  projectSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty(body)) return;
    const formData = new FormData();
    formData.set("body", body);
    startTransition(async () => {
      await createForumReply(formData, postId, projectSlug);
      setBody("");
      setEditorKey((k) => k + 1);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium text-dark-slate">Ditt svar</label>
      <RichTextEditor key={editorKey} content={body} onChange={setBody} />
      <div>
        <button
          type="submit"
          disabled={isPending || isEmpty(body)}
          className="bg-coral text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skickar…" : "Svara"}
        </button>
      </div>
    </form>
  );
}
