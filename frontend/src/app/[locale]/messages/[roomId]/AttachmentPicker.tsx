"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Duplicated from FileUpload.tsx rather than shared — that component's
// single-file prop contract (onUpload(url): void) doesn't fit a multi-file
// attach-then-send composer flow, and these are just constants, not logic.
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;
const DOC_SIZE_LIMIT = 20 * 1024 * 1024;

export type UploadedAttachment = { id: string; key: string; name: string; mimeType: string; size: number };

const PAPERCLIP_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
  />
);

const PHOTO_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
  />
);

type Props = {
  projectId?: string | null;
  organisationId?: string | null;
  disabled?: boolean;
  onUploaded: (attachment: UploadedAttachment) => void;
  onError: (message: string) => void;
  // "image" restricts the file picker to images and shows a photo icon —
  // a dedicated shortcut alongside the general "attach" (paperclip) button,
  // same pattern as WhatsApp/Telegram's separate gallery vs. file pickers.
  variant?: "attach" | "image";
};

export function AttachmentPicker({ projectId, organisationId, disabled, onUploaded, onError, variant = "attach" }: Props) {
  const t = useTranslations("AttachmentPicker");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isImageVariant = variant === "image";
  const label = isImageVariant ? t("attachImageLabel") : t("attachFileLabel");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      const isImage = IMAGE_MIME_TYPES.has(file.type);
      const sizeLimit = isImage ? IMAGE_SIZE_LIMIT : DOC_SIZE_LIMIT;
      if (file.size > sizeLimit) {
        onError(isImage ? t("imageTooLargeError", { name: file.name }) : t("fileTooLargeError", { name: file.name }));
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
          throw new Error((data as { error?: string }).error ?? t("uploadFailedGeneric"));
        }
        const data = (await res.json()) as { key: string; fileId: string };
        onUploaded({ id: data.fileId, key: data.key, name: file.name, mimeType: file.type, size: file.size });
      } catch (err) {
        onError(err instanceof Error ? err.message : t("uploadFailedNamed", { name: file.name }));
      }
    }
    setUploading(false);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={isImageVariant ? "image/*" : undefined}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        aria-label={label}
        title={label}
        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors text-dark-slate/50 hover:text-seagrass hover:bg-dry-sage/20 disabled:opacity-40"
      >
        {uploading ? (
          <span className="w-3.5 h-3.5 border-2 border-dark-slate/30 border-t-seagrass rounded-full animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px]">
            {isImageVariant ? PHOTO_ICON : PAPERCLIP_ICON}
          </svg>
        )}
      </button>
    </>
  );
}
