"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toProxyUrl } from "@/lib/storageUrl";
import { updateProjectImage } from "./actions";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

// The project's cover image at the top of "Om projektet" — the first thing a
// volunteer or sponsor sees. Without one, the team gets a large invitation to
// add it; with one, "Byt bild" on hover.
export default function ProjectCoverImage({ slug, imageUrl, title, canEdit }: { slug: string; imageUrl: string | null; title: string; canEdit: boolean }) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    setError(null);
    if (!IMAGE_TYPES.has(file.type)) return setError(t("coverWrongType"));
    if (file.size > MAX_BYTES) return setError(t("coverTooLarge"));
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("visibility", "public");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; key?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? t("coverFailed"));
      const url = data.url ?? (data.key ? `/api/files/${data.key}` : "");
      const saved = await updateProjectImage(slug, url);
      if ("error" in saved) throw new Error(saved.error);
      startTransition(() => router.refresh());
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : t("coverFailed"));
    } finally {
      setUploading(false);
    }
  }

  const src = preview ?? (imageUrl ? toProxyUrl(imageUrl) : null);
  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void upload(f);
        e.target.value = "";
      }}
    />
  );

  if (!src) {
    if (!canEdit) return null;
    return (
      <div>
        {picker}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-dark-slate/20 bg-dry-sage/10 px-6 text-center transition hover:border-seagrass hover:bg-seagrass/5"
        >
          <span aria-hidden className="text-4xl">🖼️</span>
          <span className="text-base font-semibold text-dark-slate">{uploading ? t("coverUploading") : t("coverAdd")}</span>
          <span className="max-w-md text-sm text-dark-slate/60">{t("coverWhy")}</span>
          <span className="text-xs text-dark-slate/45">{t("coverSpec")}</span>
        </button>
        {error && <p className="mt-2 text-sm text-watermelon">{error}</p>}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl">
      {picker}
      {/* A plain <img>: storage images go through /storage, not next/image. */}
      <img src={src} alt={title} className={`aspect-[21/9] w-full object-cover ${uploading ? "opacity-60" : ""}`} />
      {canEdit && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-dark-slate shadow-sm opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        >
          {uploading ? t("coverUploading") : t("coverChange")}
        </button>
      )}
      {error && <p className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-xs text-watermelon">{error}</p>}
    </div>
  );
}

// How the text measures up: the summary should be one or two short
// sentences (as the settings page asks, #312), the
// description long enough to say problem, idea and who's needed — but short
// enough that people read it to the end.
export function TextLengthMeter({ kind, value }: { kind: "summary" | "description"; value: string }) {
  const t = useTranslations("IdeaOverview");
  const plain = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  const n = kind === "summary" ? plain.length : plain ? plain.split(/\s+/).length : 0;
  const [min, max] = kind === "summary" ? [40, 220] : [80, 300];
  const state = n < min ? "short" : n > max ? "long" : "good";
  const color = state === "good" ? "bg-seagrass" : "bg-[#E08A00]";
  const pct = Math.min(100, Math.round((n / (max * 1.25)) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-dark-slate/10">
        <span className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={state === "good" ? "text-seagrass" : "text-[#9a5f00]"}>
        {t(`length.${kind}.${state}`, { n })}
      </span>
    </div>
  );
}
