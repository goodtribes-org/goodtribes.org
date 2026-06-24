"use client";

import { useState } from "react";
import { sendOrgInvite } from "./actions";

export default function OrgInviteForm({ orgId, slug }: { orgId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const action = sendOrgInvite.bind(null, orgId, slug);

  if (sent) {
    return (
      <p className="text-xs text-seagrass mt-2">
        Invite sent!{" "}
        <button onClick={() => { setSent(false); setOpen(false); }} className="underline">
          Send another
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-xs text-coral hover:underline"
      >
        + Invite by email
      </button>
    );
  }

  return (
    <form
      className="mt-3 flex gap-2"
      action={async (fd) => {
        await action(fd);
        setSent(true);
      }}
    >
      <input
        name="email"
        type="email"
        placeholder="colleague@example.com"
        required
        className="flex-1 text-xs px-2 py-1.5 border border-muted-teal/60 rounded focus:outline-none focus:border-seagrass"
      />
      <button
        type="submit"
        className="text-xs px-3 py-1.5 bg-coral text-white rounded hover:bg-watermelon transition-colors"
      >
        Send
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-dark-slate/40 hover:text-dark-slate">
        Cancel
      </button>
    </form>
  );
}
