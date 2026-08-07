"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { advancePhase } from "../actions";
import { deletePhaseContent } from "./actions";
import SprintPhaseTabs, { type PhaseRow } from "./SprintPhaseTabs";
import SprintCanvas from "./SprintCanvas";
import ContributionBoard, { type Contribution } from "./ContributionBoard";
import DotVoting, { type VotingBoard } from "./DotVoting";
import type { Prisma, SprintPace, SprintPhaseName, SprintPhaseStatus, SprintStatus } from "@prisma/client";

const PHASE_LABEL_KEY: Record<SprintPhaseName, string> = {
  UNDERSTAND: "phaseLabelUnderstand",
  DIVERGE: "phaseLabelDiverge",
  DECIDE: "phaseLabelDecide",
  PROTOTYPE: "phaseLabelPrototype",
  VALIDATE: "phaseLabelValidate",
};

const GUIDANCE_KEY: Record<SprintPhaseName, string> = {
  UNDERSTAND: "guidanceUnderstand",
  DIVERGE: "guidanceDiverge",
  DECIDE: "guidanceDecide",
  PROTOTYPE: "guidancePrototype",
  VALIDATE: "guidanceValidate",
};

type PhaseData = {
  id: string;
  status: SprintPhaseStatus;
  documentState: Prisma.JsonValue;
  version: number;
  contributions: Contribution[];
} | null;

export default function SprintWorkspace({
  projectSlug,
  sprint,
  phases,
  phaseData,
  votingBoard,
  remainingVotes,
  isLead,
  isMember,
  canDelete,
  userName,
}: {
  projectSlug: string;
  sprint: { id: string; name: string; status: SprintStatus; pace: SprintPace; currentPhase: SprintPhaseName };
  phases: PhaseRow[];
  phaseData: Record<string, PhaseData>;
  votingBoard: VotingBoard;
  remainingVotes: number;
  isLead: boolean;
  isMember: boolean;
  canDelete: boolean;
  userName: string;
}) {
  const t = useTranslations("SprintWorkspace");
  const [activeTab, setActiveTab] = useState<SprintPhaseName>(sprint.currentPhase);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isDeletingContent, setIsDeletingContent] = useState(false);

  const activePhaseRow = phases.find((p) => p.phase === activeTab);
  const activeData = phaseData[activeTab] ?? null;
  const isCanvasPhase = activeTab === "UNDERSTAND" || activeTab === "DIVERGE";
  const isDecidePhase = activeTab === "DECIDE";
  const hasOpenPhase = phases.some((p) => p.status === "OPEN");

  async function handleAdvance() {
    setIsAdvancing(true);
    await advancePhase(projectSlug, sprint.id);
    setIsAdvancing(false);
    window.location.reload();
  }

  async function handleDeleteContent() {
    if (!activePhaseRow?.id) return;
    if (
      !window.confirm(
        t("confirmDeleteContent", { phaseLabel: t(PHASE_LABEL_KEY[activeTab]) })
      )
    ) {
      return;
    }
    setIsDeletingContent(true);
    await deletePhaseContent(projectSlug, activePhaseRow.id);
    window.location.reload();
  }

  return (
    <div className={`-mt-[21px] ${isCanvasPhase ? "" : "max-w-5xl mx-auto"}`}>
      <div className="flex items-center gap-4 flex-wrap mb-[12px]">
        <div className="flex-1 hidden sm:block" aria-hidden="true" />
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-dark-slate">{sprint.name}</h1>
          <SprintPhaseTabs phases={phases} activeTab={activeTab} onSelect={setActiveTab} pace={sprint.pace} />
        </div>
        <div className="flex-1 flex items-center justify-end gap-2 flex-wrap">
          {isLead && hasOpenPhase && sprint.pace === "TOGETHER" && (
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleAdvance}
              className="text-sm font-medium text-seagrass border border-seagrass rounded-md px-4 py-2 hover:bg-seagrass/10 transition-colors disabled:opacity-60"
            >
              {isAdvancing ? t("advancing") : t("advanceToNextPhase")}
            </button>
          )}
          {canDelete && activePhaseRow?.id && (
            <button
              type="button"
              disabled={isDeletingContent}
              onClick={handleDeleteContent}
              title={t("deletePhaseContentTitle")}
              className="text-sm font-medium text-watermelon border border-watermelon/40 rounded-md px-3 py-2 hover:bg-watermelon/10 transition-colors disabled:opacity-60"
            >
              {isDeletingContent ? t("deleting") : t("deleteContent")}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                showHelp
                  ? "bg-coral text-white shadow-sm"
                  : "bg-coral/10 border border-coral text-coral hover:bg-coral/20"
              }`}
            >
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full text-[11px] leading-none flex-shrink-0 ${
                  showHelp ? "bg-white text-coral" : "bg-coral text-white"
                }`}
              >
                ?
              </span>
              {t("help")}
            </button>
            {showHelp && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-coral/30 rounded-xl shadow-lg p-4 text-sm text-dark-slate/70 z-10">
                <p className="font-medium text-dark-slate mb-1">{t(PHASE_LABEL_KEY[activeTab])}</p>
                <p>{t(GUIDANCE_KEY[activeTab])}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCanvasPhase ? (
        <div className="flex flex-col gap-6">
          {!activePhaseRow?.id ? (
            <p className="text-sm text-dark-slate/40 italic">{t("phaseNotOpenedYet")}</p>
          ) : activeData ? (
            <>
              <SprintCanvas
                projectSlug={projectSlug}
                sprintPhaseId={activeData.id}
                initialDocumentState={activeData.documentState}
                initialVersion={activeData.version}
                canEdit={isMember && activeData.status === "OPEN"}
                userName={userName}
              />
              <ContributionBoard
                projectSlug={projectSlug}
                sprintPhaseId={activeData.id}
                phaseName={activeTab}
                contributions={activeData.contributions}
                canWrite={isMember && activeData.status === "OPEN"}
              />
            </>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6">
          <aside className="border border-muted-teal/30 rounded-xl p-4 text-sm text-dark-slate/70 h-fit">
            <p className="font-medium text-dark-slate mb-2">{t(PHASE_LABEL_KEY[activeTab])}</p>
            <p>{t(GUIDANCE_KEY[activeTab])}</p>
          </aside>

          <div className="min-w-0">
            {!activePhaseRow?.id ? (
              <p className="text-sm text-dark-slate/40 italic">{t("phaseNotOpenedYet")}</p>
            ) : isDecidePhase ? (
              <DotVoting
                projectSlug={projectSlug}
                votingBoard={votingBoard}
                remainingVotes={remainingVotes}
                canVote={isMember && votingBoard?.decidePhaseStatus === "OPEN"}
              />
            ) : activeData ? (
              <ContributionBoard
                projectSlug={projectSlug}
                sprintPhaseId={activeData.id}
                phaseName={activeTab}
                contributions={activeData.contributions}
                canWrite={isMember && activeData.status === "OPEN"}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
