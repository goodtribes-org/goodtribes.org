"use client";

import { useTransition } from "react";
import Link from "next/link";
import { createForumPost } from "../actions";

export default function NewForumPostForm({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createForumPost(formData, slug);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Rubrik <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Vad handlar diskussionen om?"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
          Kategori
        </label>
        <select
          id="category"
          name="category"
          defaultValue="general"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
        >
          <option value="general">Allmänt</option>
          <option value="question">Fråga</option>
          <option value="decision">Beslut</option>
          <option value="update">Uppdatering</option>
        </select>
      </div>

      {/* Body */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-dark-slate mb-1">
          Innehåll <span className="text-watermelon">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={10}
          placeholder="Skriv ditt inlägg här… (Markdown stöds)"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none font-mono"
        />
        <p className="text-xs text-dark-slate/40 mt-1">Markdown stöds för formatering.</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-coral text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Publicerar…" : "Publicera inlägg"}
        </button>
        <Link
          href={`/projects/${slug}/forum`}
          className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
