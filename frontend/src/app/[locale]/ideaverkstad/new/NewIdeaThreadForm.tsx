"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { createIdeaThread } from "../actions";
import FileUpload from "@/components/FileUpload";

export default function NewIdeaThreadForm() {
  const t = useTranslations("NewIdeaThreadForm");
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(url: string) {
    if (imageInputRef.current) imageInputRef.current.value = url;
  }

  return (
    <form action={createIdeaThread} className="flex flex-col gap-4">
      <textarea
        name="problem"
        rows={6}
        required
        autoFocus
        placeholder={t("problemPlaceholder")}
        className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
      />
      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          {t("imageLabel")} <span className="text-dark-slate/50 font-normal">{t("imageOptionalHint")}</span>
        </label>
        <FileUpload visibility="public" accept="image/*" onUpload={handleImageUpload} />
        <input type="hidden" name="imageUrl" ref={imageInputRef} />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors"
        >
          {t("startButton")}
        </button>
        <a href="/ideaverkstad" className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">
          {t("cancelButton")}
        </a>
      </div>
    </form>
  );
}
