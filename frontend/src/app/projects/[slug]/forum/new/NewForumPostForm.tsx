"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createForumPost } from "../actions";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function isEmpty(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === "";
}

export default function NewForumPostForm({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isEmpty(body)) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("body", body);
    startTransition(async () => {
      await createForumPost(formData, slug);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
        <label className="block text-sm font-medium text-dark-slate mb-2">
          Innehåll <span className="text-watermelon">*</span>
        </label>
        <input type="hidden" name="body" value={body} />
        <RichTextEditor content={body} onChange={setBody} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || isEmpty(body)}
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
