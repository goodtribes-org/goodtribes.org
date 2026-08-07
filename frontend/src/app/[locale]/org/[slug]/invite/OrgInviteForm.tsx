"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendOrgInvite } from "./actions";

export default function OrgInviteForm({ orgId, slug }: { orgId: string; slug: string }) {
  const t = useTranslations("OrgInviteForm");
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const action = sendOrgInvite.bind(null, orgId, slug);

  if (sent) {
    return (
      <p className="text-xs text-seagrass mt-2">
        {t("inviteSentMessage")}{" "}
        <button onClick={() => { setSent(false); setOpen(false); }} className="underline">
          {t("sendAnotherButton")}
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
        {t("inviteByEmailButton")}
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
        placeholder={t("emailPlaceholder")}
        required
        className="flex-1 text-xs px-2 py-1.5 border border-muted-teal/60 rounded focus:outline-none focus:border-seagrass"
      />
      <button
        type="submit"
        className="text-xs px-3 py-1.5 bg-coral text-white rounded hover:bg-watermelon transition-colors"
      >
        {t("sendButton")}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-dark-slate/40 hover:text-dark-slate">
        {t("cancelButton")}
      </button>
    </form>
  );
}
