"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import { toProxyUrl } from "@/lib/storageUrl";

// The welcome step's picture: the shared uploader, with the result kept in
// a hidden field so the plain server-action form saves it with the name.
export default function WelcomePhoto({ current }: { current: string | null }) {
  const [url, setUrl] = useState(current ?? "");
  return (
    <div className="flex flex-col items-center">
      <FileUpload visibility="public" accept="image/*" currentImageUrl={current ?? undefined} onUpload={(u) => setUrl(toProxyUrl(u))} />
      <input type="hidden" name="image" value={url} />
    </div>
  );
}
