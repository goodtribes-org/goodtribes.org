"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { requestToJoin, respondToJoinRequest } from "./join-actions";
import MessageButton from "@/components/MessageButton";

interface JoinRequest {
  id: string;
  message: string | null;
  status: string;
  user: { id: string; name: string | null; image: string | null };
}

export function JoinButton({
  projectId,
  slug,
  existingStatus,
  label,
  className,
}: {
  projectId: string;
  slug: string;
  existingStatus: string | null;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("JoinSection");
  const [sent, setSent] = useState(existingStatus === "pending");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (existingStatus === "approved") return null;

  if (sent || existingStatus === "pending") {
    return (
      <p className="text-sm text-dark-slate/50 italic">{t("joinRequestSent")}</p>
    );
  }

  return open ? (
    <div className="border border-muted-teal rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">{t("requestToJoinHeading")}</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={t("joinMessagePlaceholder")}
        className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-seagrass resize-none"
      />
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await requestToJoin(projectId, slug, message);
              setSent(true);
              setOpen(false);
            });
          }}
          className="bg-seagrass text-white text-sm font-medium px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {isPending ? t("sendingButton") : t("sendRequestButton")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-1.5"
        >
          {t("cancelButton")}
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setOpen(true)}
      className={className ?? "bg-seagrass text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity"}
    >
      {label ?? t("joinProjectDefaultLabel")}
    </button>
  );
}

export function JoinRequestsPanel({
  requests,
  slug,
}: {
  requests: JoinRequest[];
  slug: string;
}) {
  const t = useTranslations("JoinSection");
  const [isPending, startTransition] = useTransition();
  const pending = requests.filter((r) => r.status === "pending");
  if (pending.length === 0) return null;

  return (
    <section className="border border-yellow-200 bg-yellow-50 rounded-lg p-5">
      <h3 className="text-sm font-semibold mb-3 text-yellow-800">
        {t("pendingRequestsHeading", { count: pending.length })}
      </h3>
      <div className="space-y-3">
        {pending.map((req) => (
          <div key={req.id} className="flex items-start gap-3">
            {req.user.image && (
              <img src={req.user.image} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{req.user.name ?? t("unknownName")}</p>
              {req.message && (
                <p className="text-xs text-dark-slate/60 mt-0.5">{req.message}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <MessageButton toUserId={req.user.id} toUserName={req.user.name ?? t("thisPersonFallback")} />
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await respondToJoinRequest(req.id, "approved", slug);
                  })
                }
                className="text-xs font-medium bg-seagrass text-white px-3 py-1 rounded hover:opacity-90 disabled:opacity-60"
              >
                {t("approveButton")}
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await respondToJoinRequest(req.id, "rejected", slug);
                  })
                }
                className="text-xs font-medium border border-muted-teal text-dark-slate/60 px-3 py-1 rounded hover:border-coral hover:text-coral disabled:opacity-60"
              >
                {t("declineButton")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
