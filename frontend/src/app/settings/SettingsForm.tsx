"use client";

import { useTransition } from "react";
import { updateNotifSettings, deleteAccount } from "./actions";

export default function SettingsForm({
  email,
  digestOptIn,
}: {
  email: string;
  digestOptIn: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDigestChange(e: React.ChangeEvent<HTMLInputElement>) {
    const form = e.currentTarget.form;
    if (form) {
      startTransition(async () => {
        const fd = new FormData(form);
        await updateNotifSettings(fd);
      });
    }
  }

  function handleDelete() {
    if (!confirm("Are you sure? This will permanently delete your account and cannot be undone.")) return;
    startTransition(async () => {
      await deleteAccount();
    });
  }

  return (
    <>
      {/* Email preferences */}
      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-4">
          Email preferences
        </h2>
        <div className="border border-muted-teal/40 rounded-lg divide-y divide-muted-teal/20">
          <form className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-dark-slate">Weekly digest</p>
              <p className="text-xs text-dark-slate/50 mt-0.5">
                A weekly summary of your unread notifications and new matching projects.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                name="digestOptIn"
                defaultChecked={digestOptIn}
                className="sr-only peer"
                onChange={handleDigestChange}
              />
              <div className="w-10 h-5 bg-muted-teal/40 rounded-full peer peer-checked:bg-seagrass transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </form>
        </div>
        <p className="text-xs text-dark-slate/40 mt-2">
          Logged in as <span className="font-medium">{email}</span>
          {isPending && <span className="ml-2 text-seagrass">Saving…</span>}
        </p>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold text-red-600/70 uppercase tracking-wide mb-4">
          Danger zone
        </h2>
        <div className="border border-red-200 rounded-lg p-5">
          <p className="text-sm font-medium text-dark-slate mb-1">Delete account</p>
          <p className="text-xs text-dark-slate/50 mb-4">
            Permanently removes your profile, memberships, and all your data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            Delete my account
          </button>
        </div>
      </section>
    </>
  );
}
