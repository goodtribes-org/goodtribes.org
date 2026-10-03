"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// A canvas block's text, edited where it is (2026-10-03): click the text, or
// the "Tomt" placeholder, and it becomes a text field. Leaving the field
// (click outside, Tab) saves — but only if the text changed, so an idle
// click never turns an AI guess into "Du sa". Ctrl/⌘+Enter saves too, Esc
// throws the edit away. Shared by LeanCanvasBlock, ValuePropositionBlock and
// ImpactModelBlock, whose save logic (provenance, suggestions, the
// konsekvenskontroll) stays in onSave.
export default function InlineBlockText({
  value,
  draft,
  hint,
  canEdit,
  editing,
  pending,
  rows = 5,
  emptyLabel,
  ringClass = "focus:ring-coral",
  onStart,
  onCancel,
  onSave,
}: {
  value: string | null;
  // Text to start from instead of value ("Använd delar" of an AI suggestion).
  draft?: string | null;
  hint: string;
  canEdit: boolean;
  editing: boolean;
  pending: boolean;
  rows?: number;
  emptyLabel: string;
  ringClass?: string;
  onStart: () => void;
  onCancel: () => void;
  onSave: (formData: FormData) => void;
}) {
  const t = useTranslations("CanvasInlineEdit");
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);
  const cancelled = useRef(false);
  const saving = useRef(false);
  const [saved, setSaved] = useState(false);
  // What was just saved, shown at once: the server render that follows may
  // be for another path (the phase page isn't revalidated by every action),
  // so don't wait for it. A new value from the server replaces it.
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => setLocal(null), [value]);
  const shown = local ?? value;

  // "Sparat ✓" for a moment once a save has gone through and the field closed.
  useEffect(() => {
    if (!editing && saving.current && !pending) {
      saving.current = false;
      setSaved(true);
      // Fetch the page's data again, so the block's status (border colour,
      // Du sa/AI:n gissar) follows the new text.
      router.refresh();
      const id = setTimeout(() => setSaved(false), 1800);
      return () => clearTimeout(id);
    }
  }, [editing, pending, router]);

  useEffect(() => {
    if (!editing || !ref.current) return;
    cancelled.current = false;
    const el = ref.current;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  function finish() {
    if (cancelled.current) return;
    const text = ref.current?.value ?? "";
    const start = draft ?? shown ?? "";
    if (text.trim() === (shown ?? "").trim() && text === start) {
      onCancel();
      return;
    }
    const fd = new FormData();
    fd.set("value", text);
    saving.current = true;
    setLocal(text);
    onSave(fd);
  }

  if (editing) {
    return (
      <div className="mt-1 flex flex-1 flex-col">
        <textarea
          ref={ref}
          name="value"
          defaultValue={draft ?? shown ?? ""}
          rows={rows}
          placeholder={hint}
          disabled={pending}
          onBlur={finish}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelled.current = true;
              onCancel();
            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              ref.current?.blur();
            }
          }}
          className={`w-full flex-1 resize-none rounded border border-muted-teal px-2 py-1.5 text-xs focus:outline-none focus:ring-2 ${ringClass}`}
        />
        <p className="mt-1 text-[11px] text-dark-slate/60">{pending ? t("saving") : t("howToSave")}</p>
      </div>
    );
  }

  const text = shown?.trim() ? (
    <span className="whitespace-pre-wrap text-xs leading-relaxed text-dark-slate/80">{shown}</span>
  ) : (
    <span className="text-xs italic text-dark-slate/55">{emptyLabel}</span>
  );

  return (
    <div className="relative mt-1 flex flex-1 flex-col">
      {canEdit ? (
        <button
          type="button"
          onClick={onStart}
          title={t("clickToEdit")}
          className="-mx-1 -my-0.5 flex flex-1 cursor-text flex-col items-start justify-start rounded px-1 py-0.5 text-left hover:bg-dry-sage/15 focus-visible:bg-dry-sage/15 focus-visible:outline-none"
        >
          {text}
        </button>
      ) : (
        <p className="flex-1">{text}</p>
      )}
      {saved && <span className="absolute right-0 top-0 text-[10px] font-medium text-seagrass">{t("saved")}</span>}
    </div>
  );
}
