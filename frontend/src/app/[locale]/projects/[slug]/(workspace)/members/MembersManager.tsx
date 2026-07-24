"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { respondToJoinRequest } from "../../join-actions";
import { removeMember, changeMemberRole, searchUsersToAdd, addMemberAsSiteAdmin } from "../../member-actions";
import type { ProjectRole } from "@/lib/authz";
import MessageButton from "@/components/MessageButton";

type Member = {
  userId: string;
  name: string | null;
  image: string | null;
  email: string;
  role: string;
  joinedAt: string;
};

type JoinRequest = {
  id: string;
  message: string | null;
  user: { id: string; name: string | null; image: string | null };
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  FOUNDER: "Grundare",
  ADMIN: "Admin",
  MEMBER: "Bidragsgivare",
  FOLLOWER: "Följare",
};

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

type UserResult = { id: string; name: string | null; image: string | null; email: string };

export default function MembersManager({
  project,
  members: initialMembers,
  joinRequests: initialRequests,
  currentUserId,
  viewerRole,
  viewerIsSiteAdmin,
}: {
  project: { id: string; slug: string; title: string };
  members: Member[];
  joinRequests: JoinRequest[];
  currentUserId: string;
  viewerRole: ProjectRole | null;
  viewerIsSiteAdmin: boolean;
}) {
  const viewerIsFounder = viewerRole === "FOUNDER";
  const [members, setMembers] = useState(initialMembers);
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<UserResult[]>([]);

  useEffect(() => {
    const q = addQuery.trim();
    if (!q) {
      setAddResults([]);
      return;
    }
    const id = setTimeout(() => {
      searchUsersToAdd(q, project.id).then(setAddResults).catch(() => setAddResults([]));
    }, 200);
    return () => clearTimeout(id);
  }, [addQuery, project.id]);

  function handleAddMember(userId: string) {
    startTransition(async () => {
      await addMemberAsSiteAdmin(project.id, userId, project.slug);
      const added = addResults.find((u) => u.id === userId);
      if (added) {
        setMembers((prev) => [...prev, { userId: added.id, name: added.name, image: added.image, email: added.email, role: "MEMBER", joinedAt: new Date().toISOString() }]);
      }
      setAddQuery("");
      setAddResults([]);
    });
  }

  function handleRespond(requestId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      await respondToJoinRequest(requestId, decision, project.slug);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (decision === "approved") {
        // page will revalidate; optimistically remove from requests
      }
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      await removeMember(project.id, userId, project.slug);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    });
  }

  function handleRoleChange(userId: string, role: ProjectRole) {
    startTransition(async () => {
      await changeMemberRole(project.id, userId, role, project.slug);
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
    });
  }

  function handlePromoteToFounder(userId: string, name: string | null) {
    if (!confirm(`Gör ${name ?? "medlemmen"} till grundare? De får då samma befogenheter som du.`)) return;
    handleRoleChange(userId, "FOUNDER");
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-dark-slate">Projektmedlemmar</h1>

      {/* Site-admin only: add an existing user directly, no invite/approval needed */}
      {viewerIsSiteAdmin && (
        <section>
          <h2 className="text-sm font-semibold text-dark-slate mb-3">Lägg till medlem direkt (admin)</h2>
          <div className="relative">
            <input
              type="text"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Sök på namn eller e-post…"
              className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
            />
            {addQuery.trim() && (
              <div className="mt-1 border border-muted-teal/30 rounded-xl bg-white shadow-sm divide-y divide-muted-teal/10 max-h-64 overflow-y-auto">
                {addResults.length === 0 && (
                  <p className="px-3 py-2 text-xs text-dark-slate/40 italic">Inga träffar.</p>
                )}
                {addResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleAddMember(u.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dry-sage/20 transition-colors disabled:opacity-50"
                  >
                    <Avatar name={u.name} image={u.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-dark-slate truncate">{u.name ?? "?"}</span>
                      <span className="block text-xs text-dark-slate/40 truncate">{u.email}</span>
                    </span>
                    <span className="text-xs font-semibold text-seagrass shrink-0">+ Lägg till</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pending join requests */}
      {requests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-dark-slate mb-3 flex items-center gap-2">
            Ansökningar
            <span className="bg-coral text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length}
            </span>
          </h2>
          <div className="border border-amber-200 bg-amber-50 rounded-xl divide-y divide-amber-100">
            {requests.map((req) => (
              <div key={req.id} className="flex items-start gap-3 p-4">
                <Avatar name={req.user.name} image={req.user.image} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-slate">{req.user.name ?? "Okänd"}</p>
                  {req.message && (
                    <p className="text-xs text-dark-slate/60 mt-0.5 line-clamp-2">{req.message}</p>
                  )}
                  <p className="text-[11px] text-dark-slate/40 mt-1">
                    {new Date(req.createdAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <MessageButton toUserId={req.user.id} toUserName={req.user.name ?? "denna person"} />
                  <button
                    disabled={isPending}
                    onClick={() => handleRespond(req.id, "approved")}
                    className="text-xs font-semibold bg-seagrass text-white px-3 py-1.5 rounded-lg hover:bg-seagrass/90 disabled:opacity-50 transition-colors"
                  >
                    Godkänn
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => handleRespond(req.id, "rejected")}
                    className="text-xs font-semibold border border-gray-200 text-dark-slate/60 px-3 py-1.5 rounded-lg hover:border-coral hover:text-coral disabled:opacity-50 transition-colors"
                  >
                    Avvisa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {requests.length === 0 && (
        <p className="text-sm text-dark-slate/40 italic">Inga väntande ansökningar.</p>
      )}

      {/* Current members */}
      <section>
        <h2 className="text-sm font-semibold text-dark-slate mb-3">
          Nuvarande medlemmar ({members.length})
        </h2>
        <div className="border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15">
          {members.map((m) => {
            const isOwner = m.role === "FOUNDER";
            const isSelf = m.userId === currentUserId;
            return (
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} image={m.image} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-slate truncate">
                    {m.name ?? "—"}
                    {isSelf && <span className="ml-1.5 text-[10px] text-dark-slate/40">(du)</span>}
                  </p>
                  <p className="text-xs text-dark-slate/40 truncate">{m.email}</p>
                </div>
                {isOwner ? (
                  <span className="text-xs font-semibold text-seagrass/80 px-2 py-1 bg-seagrass/10 rounded-md">
                    Grundare
                  </span>
                ) : (
                  <>
                    <select
                      value={m.role === "ADMIN" ? "ADMIN" : "MEMBER"}
                      disabled={isPending}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value as ProjectRole)}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-dark-slate/70 focus:outline-none focus:border-seagrass disabled:opacity-50"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Medlem</option>
                    </select>
                    {(viewerIsFounder || viewerIsSiteAdmin) && !isSelf && (
                      <button
                        disabled={isPending}
                        onClick={() => handlePromoteToFounder(m.userId, m.name)}
                        className="text-xs font-medium text-seagrass/80 hover:text-seagrass whitespace-nowrap disabled:opacity-50"
                        title="Gör till grundare"
                      >
                        Gör till grundare
                      </button>
                    )}
                  </>
                )}
                {!isSelf && <MessageButton toUserId={m.userId} toUserName={m.name ?? "denna person"} />}
                {!isOwner && !isSelf && (
                  <button
                    disabled={isPending}
                    onClick={() => handleRemove(m.userId)}
                    className="text-xs text-dark-slate/30 hover:text-coral transition-colors disabled:opacity-50 ml-1"
                    title="Ta bort"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
