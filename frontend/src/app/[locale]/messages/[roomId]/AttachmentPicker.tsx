"use client";

import { useRef, useState } from "react";

// Duplicated from FileUpload.tsx rather than shared — that component's
// single-file prop contract (onUpload(url): void) doesn't fit a multi-file
// attach-then-send composer flow, and these are just constants, not logic.
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;
const DOC_SIZE_LIMIT = 20 * 1024 * 1024;

export type UploadedAttachment = { id: string; key: string; name: string; mimeType: string; size: number };

type Props = {
  projectId?: string | null;
  organisationId?: string | null;
  disabled?: boolean;
  onUploaded: (attachment: UploadedAttachment) => void;
  onError: (message: string) => void;
};

export function AttachmentPicker({ projectId, organisationId, disabled, onUploaded, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      const isImage = IMAGE_MIME_TYPES.has(file.type);
      const sizeLimit = isImage ? IMAGE_SIZE_LIMIT : DOC_SIZE_LIMIT;
      if (file.size > sizeLimit) {
        onError(isImage ? `${file.name}: bilden får max vara 5 MB.` : `${file.name}: filen får max vara 20 MB.`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("visibility", "private");
        if (projectId) formData.append("projectId", projectId);
        if (organisationId) formData.append("organisationId", organisationId);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Uppladdning misslyckades.");
        }
        const data = (await res.json()) as { key: string; fileId: string };
        onUploaded({ id: data.fileId, key: data.key, name: file.name, mimeType: file.type, size: file.size });
      } catch (err) {
        onError(err instanceof Error ? err.message : `${file.name}: uppladdning misslyckades.`);
      }
    }
    setUploading(false);
  }

  return (
    <>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        aria-label="Bifoga fil"
        title="Bifoga fil"
        className="shrink-0 w-9 h-9 rounded-full text-dark-slate/50 hover:text-seagrass hover:bg-dry-sage/20 flex items-center justify-center transition-colors disabled:opacity-40 mb-1"
      >
        {uploading ? (
          <span className="w-3.5 h-3.5 border-2 border-dark-slate/30 border-t-seagrass rounded-full animate-spin" />
        ) : (
          "📎"
        )}
      </button>
    </>
  );
}
