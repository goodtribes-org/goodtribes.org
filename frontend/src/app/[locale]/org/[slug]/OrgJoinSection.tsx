"use client";

import { useTransition } from "react";
import { respondToOrgJoinRequest } from "./actions";

interface OrgJoinRequest {
  id: string;
  user: { name: string | null; image: string | null };
}

export function OrgJoinRequestsPanel({
  requests,
  slug,
}: {
  requests: OrgJoinRequest[];
  slug: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  return (
    <section className="border border-yellow-200 bg-yellow-50 rounded-lg p-5 mb-8">
      <h3 className="text-sm font-semibold mb-3 text-yellow-800">
        {requests.length} join request{requests.length !== 1 ? "s" : ""} pending
      </h3>
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center gap-3">
            {req.user.image && (
              <img src={req.user.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            )}
            <p className="text-sm font-medium flex-1 min-w-0 truncate">
              {req.user.name ?? "Unknown"}
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await respondToOrgJoinRequest(req.id, "approved", slug);
                  })
                }
                className="text-xs font-medium bg-seagrass text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await respondToOrgJoinRequest(req.id, "rejected", slug);
                  })
                }
                className="text-xs font-medium border border-muted-teal text-dark-slate/60 px-3 py-1 rounded hover:border-coral hover:text-coral disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
