"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import KanbanBoard, { type Member } from "@/components/KanbanBoard";
import TaskListView from "@/components/TaskListView";
import GanttView from "@/components/GanttView";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import HelpButton from "@/components/HelpButton";
import { updateCard, moveCard, addCardDependency, removeCardDependency } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";

type Milestone = { id: string; title: string; dueDate: Date | string | null; status: string };

type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  startDate?: Date | string | null;
  column: string;
  order: number;
  priority: string;
  assigneeId: string | null;
  assignee: Member | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { name: string | null; image?: string | null } | null;
  subtasks?: Array<{ id: string; title: string; done: boolean; order: number }>;
  estimate?: { aiHours: number; aiConfidence: string; aiReasoning: string } | null;
  aiTaskRuns?: Array<{
    id: string;
    agentType: string;
    status: string;
    outputMarkdown: string | null;
    attemptNumber: number;
    completedAt: Date | string | null;
  }>;
  dependencies?: Array<{ dependsOnId: string }>;
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

type View = "board" | "list" | "gantt";

export default function TasksPage({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
  isMember,
  isLead,
  members,
  milestones,
  openCardId,
  helpHref,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
  isMember: boolean;
  isLead: boolean;
  members: Member[];
  milestones: Milestone[];
  openCardId?: string | null;
  helpHref: string;
}) {
  const t = useTranslations("TasksPage");
  const storageKey = `tasks-view-${projectSlug}`;
  const [view, setView] = useState<View>("board");
  const [addColKey, setAddColKey] = useState<string | null>(null);

  useEffect(() => {
    if (openCardId) {
      setView("board");
      return;
    }
    const saved = localStorage.getItem(storageKey);
    if (saved === "list" || saved === "board" || saved === "gantt") setView(saved);
  }, [storageKey, openCardId]);

  function switchView(v: View) {
    setView(v);
    localStorage.setItem(storageKey, v);
  }

  const viewToggle = (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => switchView("board")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === "board"
            ? "bg-white text-dark-slate shadow-sm"
            : "text-dark-slate/50 hover:text-dark-slate"
        }`}
      >
        {t("boardLabel")}
      </button>
      <button
        onClick={() => switchView("list")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === "list"
            ? "bg-white text-dark-slate shadow-sm"
            : "text-dark-slate/50 hover:text-dark-slate"
        }`}
      >
        {t("listLabel")}
      </button>
      <button
        onClick={() => switchView("gantt")}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === "gantt"
            ? "bg-white text-dark-slate shadow-sm"
            : "text-dark-slate/50 hover:text-dark-slate"
        }`}
      >
        {t("ganttLabel")}
      </button>
    </div>
  );

  const titleAndHelp = (
    <div className="flex items-center gap-2 shrink-0">
      <h1 className="text-xl font-bold text-dark-slate">{t("pageHeading")}</h1>
      <HelpButton text={t("helpText")} moreHref={helpHref} moreLabel={t("helpGuideLink")} />
    </div>
  );

  return (
    <div>
      {/* Board view puts the title, help, filters and view toggle all on one
          row (inside KanbanBoard's own toolbar) — list/gantt have no filters,
          so they keep the plain shared header instead. */}
      {view !== "board" && (
        <WorkspacePageHeader
          title={t("pageHeading")}
          help={t("helpText")}
          helpMoreHref={helpHref}
          helpMoreLabel={t("helpGuideLink")}
          action={viewToggle}
        />
      )}
      {view === "board" && (
        <KanbanBoard
          projectSlug={projectSlug}
          initialColumns={initialColumns}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isMember={isMember}
          isLead={isLead}
          members={members}
          requestAddColumn={addColKey}
          onRequestAddDone={() => setAddColKey(null)}
          requestOpenCardId={openCardId}
          leading={titleAndHelp}
          viewToggle={viewToggle}
        />
      )}
      {view === "list" && (
        <div>
          <TaskListView
            projectSlug={projectSlug}
            initialColumns={initialColumns}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
            isLead={isLead}
            members={members}
          />
        </div>
      )}
      {view === "gantt" && (
        <div>
          <GanttView
            cards={Object.values(initialColumns).flat().map(c => ({
              ...c,
              startDate: c.startDate ?? null,
              dependsOnIds: c.dependencies?.map((d) => d.dependsOnId) ?? [],
            }))}
            milestones={milestones}
            projectSlug={projectSlug}
            isOwnerOrAdmin={isLead}
            onUpdateCard={updateCard}
            onMoveCard={moveCard}
            onAddDependency={addCardDependency}
            onRemoveDependency={removeCardDependency}
          />
        </div>
      )}
    </div>
  );
}
