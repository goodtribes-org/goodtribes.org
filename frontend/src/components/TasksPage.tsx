"use client";

import { useState, useEffect } from "react";
import KanbanBoard, { type Member } from "@/components/KanbanBoard";
import TaskListView from "@/components/TaskListView";

type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  column: string;
  order: number;
  priority: string;
  assigneeId: string | null;
  assignee: Member | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { name: string | null } | null;
  estimate?: { aiHours: number; aiConfidence: string; aiReasoning: string } | null;
  aiTaskRuns?: Array<{
    id: string;
    agentType: string;
    status: string;
    outputMarkdown: string | null;
    attemptNumber: number;
    completedAt: Date | string | null;
  }>;
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

type View = "board" | "list";

export default function TasksPage({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
  members,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
  members: Member[];
}) {
  const storageKey = `tasks-view-${projectSlug}`;
  const [view, setView] = useState<View>("board");
  const [addColKey, setAddColKey] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === "list" || saved === "board") setView(saved);
  }, [storageKey]);

  function switchView(v: View) {
    setView(v);
    localStorage.setItem(storageKey, v);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => switchView("board")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "board"
              ? "bg-white text-dark-slate shadow-sm"
              : "text-dark-slate/50 hover:text-dark-slate"
          }`}
        >
          Tavla
        </button>
        <button
          onClick={() => switchView("list")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "list"
              ? "bg-white text-dark-slate shadow-sm"
              : "text-dark-slate/50 hover:text-dark-slate"
          }`}
        >
          Lista
        </button>
      </div>
      {isLoggedIn && (
        <button
          onClick={() => setAddColKey("BACKLOG")}
          className="flex items-center gap-1.5 bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
        >
          <span className="text-base leading-none font-bold">+</span> Add task
        </button>
      )}
      </div>

      {view === "board" && (
        <KanbanBoard
          projectSlug={projectSlug}
          initialColumns={initialColumns}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          members={members}
          requestAddColumn={addColKey}
          onRequestAddDone={() => setAddColKey(null)}
        />
      )}
      {view === "list" && (
        <TaskListView
          projectSlug={projectSlug}
          initialColumns={initialColumns}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          members={members}
        />
      )}
    </div>
  );
}
