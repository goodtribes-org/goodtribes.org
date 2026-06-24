"use client";

import { useState, useTransition } from "react";
import { sendInvite } from "./actions";

export default function InviteForm({ projectId, slug }: { projectId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await sendInvite(projectId, slug, formData);
      setSent(true);
      setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-seagrass hover:underline"
      >
        + Invite by email
      </button>
    );
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        name="email"
        type="email"
        required
        autoFocus
        placeholder="colleague@example.com"
        className="flex-1 border border-muted-teal rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-coral"
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs bg-coral text-white px-3 py-1 rounded hover:bg-watermelon disabled:opacity-50 transition-colors"
      >
        {sent ? "Sent!" : isPending ? "Sending…" : "Send"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-dark-slate/40 hover:text-dark-slate"
      >
        Cancel
      </button>
    </form>
  );
}
