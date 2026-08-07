"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { removeOrgMember, changeOrgMemberRole } from "./member-actions";
import MessageButton from "@/components/MessageButton";

type OrgMember = {
  userId: string;
  role: string;
  user: { id: string; name: string | null; showProfile: boolean };
};

const ORG_ROLES = ["ADMIN", "MEMBER"] as const;

export default function OrgTeamManager({
  orgId,
  slug,
  members,
  currentUserId,
  ownerId,
}: {
  orgId: string;
  slug: string;
  members: OrgMember[];
  currentUserId: string;
  ownerId: string;
}) {
  const t = useTranslations("OrgTeamManager");
  const [isPending, startTransition] = useTransition();

  const ROLE_LABELS: Record<(typeof ORG_ROLES)[number], string> = {
    ADMIN: t("roleAdmin"),
    MEMBER: t("roleMember"),
  };

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const isOwner = m.user.id === ownerId;
        const isSelf = m.user.id === currentUserId;
        const initials = (m.user.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

        return (
          <div key={m.userId} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm text-dark-slate flex-1 min-w-0 truncate">
              {m.user.name ?? t("unknownName")}
              {isSelf && <span className="text-dark-slate/40 ml-1">{t("youLabel")}</span>}
            </span>
            {!isSelf && <MessageButton toUserId={m.user.id} toUserName={m.user.name ?? t("unknownPersonFallback")} />}
            {isOwner ? (
              <span className="text-xs text-coral font-semibold uppercase tracking-wide">{t("ownerBadge")}</span>
            ) : (
              <>
                <select
                  disabled={isPending}
                  defaultValue={m.role}
                  onChange={(e) =>
                    startTransition(() => changeOrgMemberRole(orgId, m.user.id, e.target.value, slug))
                  }
                  className="text-xs border border-muted-teal/50 rounded px-2 py-1 text-dark-slate/70 focus:outline-none focus:ring-1 focus:ring-seagrass disabled:opacity-50"
                >
                  {ORG_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(t("removeConfirm", { name: m.user.name ?? t("unknownMemberFallback") }))) return;
                    startTransition(() => removeOrgMember(orgId, m.user.id, slug));
                  }}
                  className="text-xs text-dark-slate/30 hover:text-coral transition-colors disabled:opacity-40"
                  title={t("removeMemberTitle")}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
