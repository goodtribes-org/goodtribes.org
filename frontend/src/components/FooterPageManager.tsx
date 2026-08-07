"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createFooterPage, deleteFooterPage, reorderFooterPages } from "@/app/[locale]/site-pages-actions";
import type { FooterPage } from "@/lib/sitePages";
import type { Locale } from "next-intl";

export default function FooterPageManager({
  pages,
  lockedLabels,
  locale,
}: {
  pages: FooterPage[];
  lockedLabels: string[];
  locale: Locale;
}) {
  const t = useTranslations("FooterPageManager");
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState(pages);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    startTransition(async () => {
      await reorderFooterPages(next.map((p) => p.slug), locale);
    });
  }

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setError(null);
    startTransition(async () => {
      const result = await createFooterPage(title, locale);
      if ("error" in result) { setError(result.error); return; }
      setList((prev) => [...prev, { slug: result.slug, title, href: `/pages/${result.slug}`, locked: false }]);
      setNewTitle("");
    });
  }

  function handleDelete(slug: string) {
    setList((prev) => prev.filter((p) => p.slug !== slug));
    startTransition(async () => {
      await deleteFooterPage(slug);
    });
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={t("manageTitle")}
        aria-label={t("manageTitle")}
        className="w-4 h-4 rounded border border-dark-slate/20 text-dark-slate/40 hover:text-dark-slate hover:border-dark-slate/40 text-[9px] leading-none flex items-center justify-center transition-colors"
      >
        ✎
      </button>

      {editing && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEditing(false)} />
          <div className="absolute z-50 top-6 right-0 w-72 bg-white border border-muted-teal/40 rounded-lg shadow-lg p-3 text-xs">
            <p className="font-semibold text-dark-slate mb-2">{t("manageTitle")}</p>
            <ul className="space-y-1 mb-2">
              {lockedLabels.map((label) => (
                <li key={label} className="flex items-center gap-2 text-dark-slate/30 px-1.5 py-1">
                  <span aria-hidden>🔒</span>
                  <span className="flex-1 truncate">{label}</span>
                  <span className="text-[10px] border border-dark-slate/10 rounded px-1 shrink-0">{t("appFeatureBadge")}</span>
                </li>
              ))}
              {list.map((p, i) => (
                <li key={p.slug} className="flex items-center gap-1.5 bg-gray-50 rounded px-1.5 py-1">
                  <span className="flex-1 truncate text-dark-slate/80">{p.title}</span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-dark-slate/40 hover:text-dark-slate disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="text-dark-slate/40 hover:text-dark-slate disabled:opacity-30">↓</button>
                  {!p.locked && (
                    <button type="button" onClick={() => handleDelete(p.slug)} title={t("deleteTitle")} className="text-coral hover:text-watermelon">✕</button>
                  )}
                </li>
              ))}
            </ul>
            {error && <p className="text-watermelon mb-2">{error}</p>}
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                placeholder={t("newPagePlaceholder")}
                maxLength={200}
                className="flex-1 border border-muted-teal rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-coral"
              />
              <button type="button" onClick={handleAdd} disabled={!newTitle.trim()} className="text-seagrass hover:underline disabled:opacity-40 shrink-0">{t("addButton")}</button>
            </div>
            <button type="button" onClick={() => setEditing(false)} className="text-dark-slate/50 hover:text-dark-slate">{t("doneButton")}</button>
          </div>
        </>
      )}
    </span>
  );
}
