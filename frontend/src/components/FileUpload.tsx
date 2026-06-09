"use client";

import { useRef, useState } from "react";

type Props = {
  onUpload: (url: string) => void;
  visibility: "public" | "private";
  accept?: string;
  currentImageUrl?: string;
};

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;
const DOC_SIZE_LIMIT = 20 * 1024 * 1024;

export default function FileUpload({ onUpload, visibility, accept = "image/*", currentImageUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const isImage = IMAGE_MIME_TYPES.has(file.type);
    const sizeLimit = isImage ? IMAGE_SIZE_LIMIT : DOC_SIZE_LIMIT;
    if (file.size > sizeLimit) {
      setError(isImage ? "Bilden får max vara 5 MB." : "Filen får max vara 20 MB.");
      return;
    }

    if (isImage) {
      setPreview(URL.createObjectURL(file));
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", visibility);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Uppladdning misslyckades.");
      }

      const data = await res.json() as { url?: string; key?: string };
      const resultUrl = data.url ?? (data.key ? `/api/files/${data.key}` : "");
      onUpload(resultUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uppladdning misslyckades.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const displayImage = preview ?? currentImageUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      {displayImage && accept?.startsWith("image") && (
        <img
          src={displayImage}
          alt="Förhandsgranskning"
          className="w-24 h-24 rounded-full object-cover border border-muted-teal"
        />
      )}
      {!displayImage && accept?.startsWith("image") && (
        <div className="w-24 h-24 rounded-full bg-dry-sage flex items-center justify-center text-4xl text-dark-slate/30">
          👤
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-50"
      >
        {uploading ? "Laddar upp…" : "Välj fil"}
      </button>

      {error && <p className="text-xs text-watermelon">{error}</p>}
    </div>
  );
}
