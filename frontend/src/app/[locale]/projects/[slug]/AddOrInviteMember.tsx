"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { searchUsersToAdd, addMemberDirectly, inviteMemberByEmail, getPendingInvites } from "./member-actions";

function looksLikeEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

type UserResult = { id: string; name: string | null; image: string | null; email: string };
type PendingInvite = { id: string; email: string | null; createdAt: string; expiresAt: string };

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate shrink-0 overflow-hidden relative">
      {image ? (
        <Image src={image} alt={name ?? ""} fill className="object-cover" unoptimized />
      ) : (
        initials
      )}
    </div>
  );
}

// Shared by MembersManager (full member management) and the idea guide's
// "Bjud in vänner" step — search adds an existing GoodTribes member as a
// project member on the spot; an unmatched email falls back to an invite
// link for people not yet on the platform. Both paths go through the same
// project-lead-gated actions in ./member-actions.
export default function AddOrInviteMember({
  projectId,
  slug,
  onAdded,
  onInviteSent,
}: {
  projectId: string;
  slug: string;
  onAdded?: (user: UserResult) => void;
  onInviteSent?: () => void;
}) {
  const t = useTranslations("AddOrInviteMember");
  const [isPending, startTransition] = useTransition();
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<UserResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [inviteState, setInviteState] = useState<{ status: "idle" | "sent"; error?: string }>({ status: "idle" });
  const [inviteMessage, setInviteMessage] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  function refreshPendingInvites() {
    getPendingInvites(projectId).then(setPendingInvites).catch(() => {});
  }

  useEffect(() => {
    refreshPendingInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const q = addQuery.trim();
    if (!q) {
      setAddResults([]);
      setSearched(false);
      return;
    }
    const id = setTimeout(() => {
      searchUsersToAdd(q, projectId)
        .then((r) => { setAddResults(r); setSearched(true); })
        .catch(() => { setAddResults([]); setSearched(true); });
    }, 200);
    return () => clearTimeout(id);
  }, [addQuery, projectId]);

  function handleAddMember(user: UserResult) {
    startTransition(async () => {
      await addMemberDirectly(projectId, user.id, slug);
      onAdded?.(user);
      setAddQuery("");
      setAddResults([]);
      setSearched(false);
    });
  }

  function handleInviteByEmail() {
    setInviteState({ status: "idle" });
    startTransition(async () => {
      const result = await inviteMemberByEmail(projectId, slug, addQuery.trim(), inviteMessage);
      if ("error" in result) { setInviteState({ status: "idle", error: result.error }); return; }
      setInviteState({ status: "sent" });
      setAddQuery("");
      setAddResults([]);
      setSearched(false);
      // Message is left as-is (not cleared) — sending several invites in a
      // row shouldn't mean retyping the same note every time.
      refreshPendingInvites();
      onInviteSent?.();
    });
  }

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={addQuery}
          onChange={(e) => { setAddQuery(e.target.value); setInviteState({ status: "idle" }); }}
          placeholder={t("searchPlaceholder")}
          className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
        />
        {addQuery.trim() && (
          <div className="mt-1 border border-muted-teal/30 rounded-xl bg-white shadow-sm divide-y divide-muted-teal/10 max-h-64 overflow-y-auto">
            {addResults.length === 0 && searched && !looksLikeEmail(addQuery) && (
              <p className="px-3 py-2 text-xs text-dark-slate/40 italic">{t("noMatches")}</p>
            )}
            {addResults.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={isPending}
                onClick={() => handleAddMember(u)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dry-sage/20 transition-colors disabled:opacity-50"
              >
                <Avatar name={u.name} image={u.image} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-dark-slate truncate">{u.name ?? "?"}</span>
                  <span className="block text-xs text-dark-slate/40 truncate">{u.email}</span>
                </span>
                <span className="text-xs font-semibold text-seagrass shrink-0">{t("addButton")}</span>
              </button>
            ))}
            {searched && addResults.length === 0 && looksLikeEmail(addQuery) && (
              <div className="p-3">
                <p className="text-sm text-dark-slate mb-2">
                  {t("inviteByEmailPrompt", { email: addQuery.trim() })}
                </p>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={t("inviteMessagePlaceholder")}
                  rows={2}
                  className="w-full text-xs border border-muted-teal/30 rounded-md px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40 resize-none placeholder:text-dark-slate/30"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleInviteByEmail}
                  className="text-xs font-semibold bg-seagrass text-white px-3 py-1.5 rounded-lg hover:bg-seagrass/90 disabled:opacity-50 transition-colors"
                >
                  {t("sendInviteButton")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {inviteState.error && <p className="text-xs text-coral mt-1.5">{inviteState.error}</p>}
      {inviteState.status === "sent" && <p className="text-xs text-seagrass mt-1.5">{t("inviteSentMessage")}</p>}

      {/* Pending email invites — only ever populated for a founder/admin,
          since getPendingInvites returns [] for anyone else. */}
      {pendingInvites.length > 0 && (
        <div className="mt-4 pt-4 border-t border-muted-teal/15">
          <p className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">
            {t("pendingInvitesHeading")}
          </p>
          <ul className="flex flex-col gap-1.5">
            {pendingInvites.map((inv) => {
              const expired = new Date(inv.expiresAt) < new Date();
              return (
                <li key={inv.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-dark-slate/70 truncate">{inv.email}</span>
                  <span className={`text-xs shrink-0 ${expired ? "text-dark-slate/30" : "text-seagrass/80"}`}>
                    {expired ? t("statusExpired") : t("statusPending")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
