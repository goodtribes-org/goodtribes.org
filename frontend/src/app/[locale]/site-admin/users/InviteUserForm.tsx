"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { inviteUser } from "./actions";

export default function InviteUserForm() {
  const t = useTranslations("InviteUserForm");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await inviteUser(email);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? t("genericError") });
        return;
      }
      setMessage({ type: "ok", text: t("inviteSent", { email }) });
      setEmail("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-6">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="flex-1 max-w-sm border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
        >
          {isPending ? t("sending") : t("submit")}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-seagrass" : "text-coral"}`}>{message.text}</p>
      )}
    </form>
  );
}
