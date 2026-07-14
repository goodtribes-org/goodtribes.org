"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ResourceFile = {
  id: string;
  key: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

type Props = {
  organisationId?: string;
  projectId?: string;
  files: ResourceFile[];
  canUpload: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourceLibrary({ organisationId, projectId, files, canUpload }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", "private");
      if (organisationId) formData.append("organisationId", organisationId);
      if (projectId) formData.append("projectId", projectId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Uppladdning misslyckades.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uppladdning misslyckades.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canUpload && (
        <div>
          <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-50"
          >
            {uploading ? "Laddar upp…" : "Ladda upp fil"}
          </button>
          {error && <p className="text-xs text-watermelon mt-1">{error}</p>}
        </div>
      )}

      {files.length === 0 ? (
        <p className="text-dark-slate/40 italic text-sm">Inga resurser ännu.</p>
      ) : (
        <div className="flex flex-col divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
          {files.map((f) => (
            <a
              key={f.id}
              href={`/api/files/${f.key}`}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-dry-sage/10 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark-slate truncate">{f.name}</p>
                <p className="text-xs text-dark-slate/40">
                  {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("sv-SE")}
                </p>
              </div>
              <span className="text-xs text-coral flex-shrink-0">Ladda ner</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
