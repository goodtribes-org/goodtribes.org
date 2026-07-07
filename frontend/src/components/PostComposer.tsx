"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { createFeedPost } from "@/app/actions";

export default function PostComposer({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-muted-teal/40 bg-white p-3 text-center">
        <p className="text-xs text-dark-slate/50">
          <Link href="/login" className="text-coral hover:underline">Logga in</Link> för att skriva ett inlägg.
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value ?? "";
    if (!body.trim()) return;
    startTransition(async () => {
      await createFeedPost(body);
      if (ref.current) ref.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-muted-teal/40 bg-white p-3 flex flex-col gap-2">
      <textarea
        ref={ref}
        rows={2}
        placeholder="Vad vill du dela med plattformen?"
        className="w-full border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
        >
          {pending ? "Postar..." : "Publicera"}
        </button>
      </div>
    </form>
  );
}
