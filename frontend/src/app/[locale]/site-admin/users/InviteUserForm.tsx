"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "./actions";

export default function InviteUserForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await inviteUser(email);
      if (!result.ok) {
        setMessage({ type: "error", text: result.error ?? "Något gick fel" });
        return;
      }
      setMessage({ type: "ok", text: `Inbjudan skickad till ${email}` });
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
          placeholder="ny.anvandare@example.com"
          className="flex-1 max-w-sm border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
        >
          {isPending ? "Skickar…" : "Bjud in användare"}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-seagrass" : "text-coral"}`}>{message.text}</p>
      )}
    </form>
  );
}
