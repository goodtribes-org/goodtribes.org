"use client";

import { useTransition } from "react";
import Image from "next/image";
import { removeMember, changeMemberRole } from "./member-actions";
import type { ProjectRole } from "@/lib/authz";

type Member = {
  userId: string;
  role: string;
  user: { id: string; name: string | null; image: string | null; showProfile: boolean };
};

const ROLES: ProjectRole[] = ["ADMIN", "MEMBER", "FOLLOWER"];

export default function TeamManager({
  projectId,
  slug,
  members,
  currentUserId,
}: {
  projectId: string;
  slug: string;
  members: Member[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const isOwner = m.role === "FOUNDER";
        const isSelf = m.user.id === currentUserId;
        const initials = (m.user.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

        return (
          <div key={m.userId} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden relative flex-shrink-0">
              {m.user.image ? (
                <Image src={m.user.image} alt={m.user.name ?? ""} fill className="object-cover" unoptimized />
              ) : initials}
            </div>
            <span className="text-sm text-dark-slate flex-1 min-w-0 truncate">
              {m.user.name ?? "Unknown"}
              {isSelf && <span className="text-dark-slate/40 ml-1">(you)</span>}
            </span>
            {isOwner ? (
              <span className="text-xs text-coral font-semibold uppercase tracking-wide">Owner</span>
            ) : (
              <>
                <select
                  disabled={isPending}
                  defaultValue={m.role}
                  onChange={(e) =>
                    startTransition(() => changeMemberRole(projectId, m.user.id, e.target.value as ProjectRole, slug))
                  }
                  className="text-xs border border-muted-teal/50 rounded px-2 py-1 text-dark-slate/70 focus:outline-none focus:ring-1 focus:ring-seagrass disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`Remove ${m.user.name ?? "this member"} from the project?`)) return;
                    startTransition(() => removeMember(projectId, m.user.id, slug));
                  }}
                  className="text-xs text-dark-slate/30 hover:text-coral transition-colors disabled:opacity-40"
                  title="Remove member"
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
