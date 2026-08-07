"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitContribution } from "./actions";
import CommentThread, { type CommentNode } from "./CommentThread";
import type { SprintContributionType } from "@prisma/client";

export type Contribution = {
  id: string;
  type: SprintContributionType;
  content: string;
  createdAt: Date;
  visibleAuthor: boolean;
  authorName: string | null;
  voteCount: number;
  comments: CommentNode[];
};

const TYPE_OPTIONS: Record<string, SprintContributionType[]> = {
  UNDERSTAND: ["HMW"],
  DIVERGE: ["SKETCH"],
  PROTOTYPE: ["PROTOTYPE_LINK"],
  VALIDATE: ["FEEDBACK"],
};

export default function ContributionBoard({
  projectSlug,
  sprintPhaseId,
  phaseName,
  contributions,
  canWrite,
}: {
  projectSlug: string;
  sprintPhaseId: string;
  phaseName: string;
  contributions: Contribution[];
  canWrite: boolean;
}) {
  const t = useTranslations("ContributionBoard");
  const options = TYPE_OPTIONS[phaseName] ?? ["FEEDBACK"];
  const [type, setType] = useState<SprintContributionType>(options[0]);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const typeLabel: Record<SprintContributionType, string> = {
    HMW: t("typeHmw"),
    SKETCH: t("typeSketch"),
    PROTOTYPE_LINK: t("typePrototypeLink"),
    FEEDBACK: t("typeFeedback"),
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    startTransition(async () => {
      await submitContribution(projectSlug, sprintPhaseId, type, content);
      setContent("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <form onSubmit={handleSubmit} className="border border-muted-teal/30 rounded-xl p-4 flex flex-col gap-2">
          {options.length > 1 && (
            <div className="flex gap-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setType(opt)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    type === opt ? "bg-seagrass text-white border-seagrass" : "border-muted-teal text-dark-slate/60"
                  }`}
                >
                  {typeLabel[opt]}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={
              type === "HMW"
                ? t("placeholderHmw")
                : type === "SKETCH"
                  ? t("placeholderSketch")
                  : type === "PROTOTYPE_LINK"
                    ? t("placeholderPrototypeLink")
                    : t("placeholderFeedback")
            }
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="self-start bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
          >
            {isPending ? t("sending") : t("submitButton")}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {contributions.map((c) => (
          <div key={c.id} className="border border-muted-teal/30 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-dark-slate/40 uppercase tracking-wide">{typeLabel[c.type]}</span>
              <span className="text-xs text-dark-slate/40">{c.visibleAuthor ? c.authorName ?? t("unknownAuthor") : t("anonymousContribution")}</span>
            </div>
            <p className="text-sm text-dark-slate/80 whitespace-pre-wrap">{c.content}</p>
            <CommentThread projectSlug={projectSlug} contributionId={c.id} comments={c.comments} canWrite={canWrite} />
          </div>
        ))}
        {contributions.length === 0 && <p className="text-sm text-dark-slate/40 italic">{t("noContributionsYet")}</p>}
      </div>
    </div>
  );
}
