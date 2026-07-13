"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startDirectMessage } from "@/app/[locale]/messages/actions";

interface MessageButtonProps {
  toUserId: string;
  toUserName: string;
}

export default function MessageButton({ toUserId, toUserName }: MessageButtonProps) {
  const t = useTranslations("Messages");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleOpen() {
    setError(null);
    setMessage("");
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { roomId } = await startDirectMessage(toUserId, message.trim());
      router.push(`/messages/${roomId}`);
    } catch {
      setError(t("sendError"));
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md border border-muted-teal text-dark-slate hover:bg-dry-sage/40 transition-colors"
      >
        <span aria-hidden="true">&#128172;</span>
        {t("cta")}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={handleClose} />

          <div className="absolute z-50 mt-2 left-0 w-72 bg-white border border-muted-teal rounded-xl shadow-lg p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-sm font-medium text-dark-slate">
                {t("sendTo", { name: toUserName })}
              </p>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={10_000}
                rows={3}
                placeholder={t("placeholder")}
                className="w-full text-sm border border-muted-teal rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
                disabled={loading}
              />
              {error && <p className="text-xs text-coral font-medium">{error}</p>}
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
                  disabled={loading}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading || message.trim().length === 0}
                  className="text-sm font-medium bg-seagrass text-white px-3 py-1.5 rounded-md hover:bg-seagrass/80 transition-colors disabled:opacity-50"
                >
                  {loading ? t("sending") : t("send")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
