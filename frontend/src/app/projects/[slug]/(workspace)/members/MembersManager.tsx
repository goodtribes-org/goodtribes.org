"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { respondToJoinRequest } from "../../join-actions";
import { removeMember, changeMemberRole } from "../../member-actions";

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
  owner: "Ägare",
  admin: "Admin",
  collaborator: "Bidragsgivare",
  follower: "Följare",
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

export default function MembersManager({
  project,
  members: initialMembers,
  joinRequests: initialRequests,
  currentUserId,
}: {
  project: { id: string; slug: string; title: string };
  members: Member[];
  joinRequests: JoinRequest[];
  currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();

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

  function handleRoleChange(userId: string, role: string) {
    startTransition(async () => {
      await changeMemberRole(project.id, userId, role, project.slug);
      setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-dark-slate">Projektmedlemmar</h1>

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
            const isOwner = m.role === "owner";
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
                  <span className="text-xs font-semibold text-dark-slate/50 px-2 py-1 bg-gray-100 rounded-md">
                    Ägare
                  </span>
                ) : (
                  <select
                    value={m.role}
                    disabled={isPending}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-dark-slate/70 focus:outline-none focus:border-seagrass disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="collaborator">Bidragsgivare</option>
                    <option value="follower">Följare</option>
                  </select>
                )}
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
