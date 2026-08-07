"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { createBlogPost } from "./actions";

export default function NewBlogPostForm({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("NewBlogPostForm");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createBlogPost(slug, formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          {t("titleLabel")} <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder={t("titlePlaceholder")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-dark-slate mb-1">
          {t("contentLabel")} <span className="text-watermelon">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={10}
          placeholder={t("contentPlaceholder")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none font-mono"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
      >
        {isPending ? t("publishing") : t("publishButton")}
      </button>
    </form>
  );
}
