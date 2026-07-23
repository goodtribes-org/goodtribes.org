"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { createFeedPost } from "@/app/actions";

const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;

export default function PostComposer({ isLoggedIn, projectId }: { isLoggedIn: boolean; projectId?: string }) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-muted-teal/40 bg-white p-3 text-center">
        <p className="text-xs text-dark-slate/50">
          <Link href="/login" className="text-coral hover:underline">Logga in</Link> för att skriva ett inlägg.
        </p>
      </div>
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > IMAGE_SIZE_LIMIT) {
      setError("Bilden får max vara 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", "public");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Uppladdning misslyckades.");
      }

      const data = await res.json() as { url?: string };
      setImageUrl(data.url ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uppladdning misslyckades.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = textRef.current?.value ?? "";
    if (!body.trim() && !imageUrl) return;
    startTransition(async () => {
      const result = await createFeedPost(body, imageUrl, projectId);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      if (textRef.current) textRef.current.value = "";
      setImageUrl(null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-muted-teal/40 bg-white p-3 flex flex-col gap-2">
      <textarea
        ref={textRef}
        rows={2}
        placeholder="Vad vill du dela med plattformen?"
        className="w-full border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
      />

      {imageUrl && (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-muted-teal/40">
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover" />
          <button
            type="button"
            onClick={() => setImageUrl(null)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-dark-slate/70 text-white text-xs flex items-center justify-center hover:bg-dark-slate transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="text-xs text-watermelon">{error}</p>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="text-xs text-dark-slate/50 hover:text-seagrass transition-colors disabled:opacity-50"
        >
          {uploading ? "Laddar upp…" : "📷 Lägg till bild"}
        </button>
        <button
          type="submit"
          disabled={pending || uploading}
          className="px-4 py-1.5 bg-coral text-white text-xs font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
        >
          {pending ? "Postar..." : "Publicera"}
        </button>
      </div>
    </form>
  );
}
