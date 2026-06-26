"use client";

import { useTransition, useRef } from "react";
import { createForumReply } from "../actions";

export default function ReplyForm({
  postId,
  projectSlug,
}: {
  postId: string;
  projectSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createForumReply(formData, postId, projectSlug);
      ref.current?.reset();
    });
  }

  return (
    <form ref={ref} action={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="body" className="text-sm font-medium text-dark-slate">
        Ditt svar
      </label>
      <textarea
        id="body"
        name="body"
        required
        rows={4}
        placeholder="Skriv ditt svar…"
        className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
      />
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-coral text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skickar…" : "Svara"}
        </button>
      </div>
    </form>
  );
}
