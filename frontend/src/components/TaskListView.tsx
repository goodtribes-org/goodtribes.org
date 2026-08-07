"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Member } from "@/components/KanbanBoard";
import { TokenPayoutDialog } from "./TokenPayoutDialog";
import type { MoveOverrides } from "@/lib/kanbanMove";
import {
  createCard,
  moveCard,
  deleteCard,
  toggleSubtask,
} from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import GithubCardMeta from "@/components/GithubCardMeta";
import { CATEGORY_LABEL_KEYS, CATEGORY_ORDER } from "@/lib/kanbanCategories";
import { COLUMN_LABEL_KEYS } from "@/lib/kanbanColumns";

type Subtask = {
  id: string;
  title: string;
  done: boolean;
  order: number;
  completedById?: string | null;
};

type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  column: string;
  order: number;
  priority: string;
  priorityLockedAt?: Date | string | null;
  lockedTokenValue?: number | null;
  category?: string | null;
  assigneeId: string | null;
  assignee: Member | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { name: string | null } | null;
  source?: string;
  githubNumber?: number | null;
  githubType?: string | null;
  githubUrl?: string | null;
  githubState?: string | null;
  githubMerged?: boolean;
  githubDraft?: boolean;
  githubLabels?: string[];
  githubAssignees?: string[];
  subtasks?: Subtask[];
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

const COLUMN_DEFS = [
  { key: "BACKLOG", color: "#8b5cf6" },
  { key: "TODO",    color: "#f59e0b" },
  { key: "DOING",   color: "#3b82f6" },
  { key: "REVIEW",  color: "#6b7280" },
  { key: "DONE",    color: "#10b981" },
];

const PRIORITY_DOT: Record<string, string> = {
  low:    "bg-gray-300",
  normal: "bg-blue-400",
  high:   "bg-orange-400",
  urgent: "bg-red-500",
  showstopper: "bg-gray-900",
};

function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function TaskListView({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
  isLead,
  members,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
  isLead: boolean;
  members: Member[];
}) {
  const tShared = useTranslations("KanbanShared");
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ DONE: true });
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [pendingDonePayout, setPendingDonePayout] = useState<Card | null>(null);

  function handleCardMoved(cardId: string, toColumn: keyof Columns) {
    setColumns((prev) => {
      const srcKey = (Object.keys(prev) as (keyof Columns)[]).find((k) =>
        prev[k].some((c) => c.id === cardId)
      );
      if (!srcKey || srcKey === toColumn) return prev;
      const card = prev[srcKey].find((c) => c.id === cardId)!;
      return {
        ...prev,
        [srcKey]: prev[srcKey].filter((c) => c.id !== cardId),
        [toColumn]: [...prev[toColumn], { ...card, column: toColumn }],
      };
    });
  }

  function handleCardDeleted(cardId: string) {
    setColumns((prev) => {
      const srcKey = (Object.keys(prev) as (keyof Columns)[]).find((k) =>
        prev[k].some((c) => c.id === cardId)
      );
      if (!srcKey) return prev;
      return { ...prev, [srcKey]: prev[srcKey].filter((c) => c.id !== cardId) };
    });
  }

  function handleCardAdded(card: Card) {
    const col = card.column as keyof Columns;
    setColumns((prev) => ({ ...prev, [col]: [...prev[col], card] }));
    setAddingInColumn(null);
  }

  function handleSubtasksChanged(cardId: string, subtasks: Subtask[]) {
    setColumns((prev) => {
      const srcKey = (Object.keys(prev) as (keyof Columns)[]).find((k) =>
        prev[k].some((c) => c.id === cardId)
      );
      if (!srcKey) return prev;
      if (prev[srcKey].find((c) => c.id === cardId)?.subtasks === subtasks) return prev;
      return {
        ...prev,
        [srcKey]: prev[srcKey].map((c) => c.id === cardId ? { ...c, subtasks } : c),
      };
    });
  }

  function handleConfirmDonePayout(overrides: MoveOverrides) {
    if (!pendingDonePayout) return;
    const card = pendingDonePayout;
    const previousColumn = card.column as keyof Columns;
    setPendingDonePayout(null);
    handleCardMoved(card.id, "DONE");
    moveCard(card.id, "DONE", overrides).catch(() => handleCardMoved(card.id, previousColumn));
  }

  return (
    <div className="max-w-2xl">
      {COLUMN_DEFS.map((col) => (
        <SectionGroup
          key={col.key}
          col={{ ...col, label: tShared(COLUMN_LABEL_KEYS[col.key]) }}
          cards={columns[col.key as keyof Columns]}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isLead={isLead}
          isCollapsed={!!collapsed[col.key]}
          onToggleCollapse={() =>
            setCollapsed((p) => ({ ...p, [col.key]: !p[col.key] }))
          }
          isAddingHere={addingInColumn === col.key}
          onOpenAdd={() => setAddingInColumn(col.key)}
          onCloseAdd={() => setAddingInColumn(null)}
          onCardAdded={handleCardAdded}
          onCardMoved={handleCardMoved}
          onCardDeleted={handleCardDeleted}
          onSubtasksChanged={handleSubtasksChanged}
          onRequestDonePayout={setPendingDonePayout}
          projectSlug={projectSlug}
        />
      ))}

      {pendingDonePayout && (
        <TokenPayoutDialog
          card={pendingDonePayout}
          members={members}
          onConfirm={handleConfirmDonePayout}
          onCancel={() => setPendingDonePayout(null)}
        />
      )}
    </div>
  );
}

function SectionGroup({
  col,
  cards,
  isLoggedIn,
  currentUserId,
  isLead,
  isCollapsed,
  onToggleCollapse,
  isAddingHere,
  onOpenAdd,
  onCloseAdd,
  onCardAdded,
  onCardMoved,
  onCardDeleted,
  onSubtasksChanged,
  onRequestDonePayout,
  projectSlug,
}: {
  col: { key: string; label: string; color: string };
  cards: Card[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  isLead: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isAddingHere: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onCardAdded: (card: Card) => void;
  onCardMoved: (id: string, toColumn: keyof Columns) => void;
  onCardDeleted: (id: string) => void;
  onSubtasksChanged: (id: string, subtasks: Subtask[]) => void;
  onRequestDonePayout: (card: Card) => void;
  projectSlug: string;
}) {
  const t = useTranslations("TaskListView");
  const [, startTransition] = useTransition();

  return (
    <div className="mb-6">
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 w-full py-2 group text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: col.color }}
        />
        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
        <span className="text-xs text-gray-400 font-normal">({cards.length})</span>
        <svg
          className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="h-px bg-gray-100 mb-1" />

      {!isCollapsed && (
        <>
          {cards.map((card) => (
            <TaskRow
              key={card.id}
              card={card}
              isLoggedIn={isLoggedIn}
              currentUserId={currentUserId}
              onSubtasksChanged={(subtasks) => onSubtasksChanged(card.id, subtasks)}
              onCheck={() => {
                if (card.column === "DONE") {
                  onCardMoved(card.id, "TODO");
                  startTransition(async () => {
                    try { await moveCard(card.id, "TODO"); }
                    catch { onCardMoved(card.id, "DONE"); }
                  });
                } else {
                  // Regular members can't mark a card done directly — it goes to Review for a lead to approve.
                  const target: keyof Columns = isLead ? "DONE" : "REVIEW";
                  const previousColumn = card.column as keyof Columns;
                  if (target === previousColumn) return;
                  if (target === "DONE") {
                    onRequestDonePayout(card);
                    return;
                  }
                  onCardMoved(card.id, target);
                  startTransition(async () => {
                    try { await moveCard(card.id, target); }
                    catch { onCardMoved(card.id, previousColumn); }
                  });
                }
              }}
              onDelete={() => {
                onCardDeleted(card.id);
                startTransition(async () => { try { await deleteCard(card.id); } catch { /* ignore */ } });
              }}
            />
          ))}

          {isLoggedIn && (
            isAddingHere ? (
              <InlineAddRow
                projectSlug={projectSlug}
                column={col.key}
                onAdd={onCardAdded}
                onClose={onCloseAdd}
              />
            ) : (
              <button
                onClick={onOpenAdd}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-seagrass py-1.5 mt-1 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                {t("addTaskButton")}
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({
  card,
  isLoggedIn,
  currentUserId,
  onSubtasksChanged,
  onCheck,
  onDelete,
}: {
  card: Card;
  isLoggedIn: boolean;
  currentUserId: string | null;
  onSubtasksChanged: (subtasks: Subtask[]) => void;
  onCheck: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("TaskListView");
  const isDone = card.column === "DONE";
  const due = formatDate(card.dueDate);
  const priorityDot = PRIORITY_DOT[card.priority] ?? "bg-gray-300";
  const hasSubtasks = (card.subtasks?.length ?? 0) > 0;
  // Mirrored from GitHub: state comes from the issue, so no local edits.
  const canEdit = isLoggedIn && card.source !== "github";
  const [expanded, setExpanded] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(card.subtasks ?? []);
  const [, startSubTransition] = useTransition();
  const subtasksMountedRef = useRef(false);
  useEffect(() => {
    if (!subtasksMountedRef.current) { subtasksMountedRef.current = true; return; }
    onSubtasksChanged(localSubtasks);
  }, [localSubtasks, onSubtasksChanged]);

  return (
    <div className="group">
      <div className="flex items-center gap-3 py-2 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors">
        <button
          onClick={canEdit ? onCheck : undefined}
          className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
            isDone
              ? "bg-seagrass border-seagrass"
              : canEdit
                ? "border-gray-300 hover:border-seagrass"
                : "border-gray-200 cursor-default"
          }`}
          aria-label={isDone ? t("markAsNotDoneAria") : t("markAsDoneAria")}
        >
          {isDone && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot}`} />

        <button
          onClick={hasSubtasks ? () => setExpanded((e) => !e) : undefined}
          className={`text-sm flex-1 text-left truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"} ${hasSubtasks ? "cursor-pointer" : "cursor-default"}`}
        >
          {card.title}
        </button>

        <GithubCardMeta card={card} compact />

        {hasSubtasks && (
          <span className={`text-xs font-medium shrink-0 ${localSubtasks.every((s) => s.done) ? "text-green-600" : "text-gray-400"}`}>
            {localSubtasks.filter((s) => s.done).length}/{localSubtasks.length}
          </span>
        )}

        {due && !isDone && (
          <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {due}
          </span>
        )}

        {card.assignee && (
          <div className="w-6 h-6 rounded-full bg-seagrass flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(card.assignee.name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}

        {hasSubtasks && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-gray-300 hover:text-gray-500 shrink-0 transition-colors"
            aria-label={expanded ? t("hideSubtasksAria") : t("showSubtasksAria")}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {canEdit && currentUserId === card.createdById && (
          <button
            onClick={onDelete}
            className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-lg leading-none"
            aria-label={t("deleteTaskAria")}
          >
            ×
          </button>
        )}
      </div>

      {expanded && hasSubtasks && (
        <div className="ml-8 mb-1 space-y-0.5">
          {localSubtasks.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                const next = !s.done;
                setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: next, completedById: next ? currentUserId : null } : t));
                if (!s.id.startsWith("temp-") && canEdit) {
                  startSubTransition(async () => {
                    try { await toggleSubtask(s.id, next); }
                    catch { setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: s.done, completedById: s.completedById } : t)); }
                  });
                }
              }}
              className="flex items-center gap-2 w-full text-left py-0.5 group/sub"
            >
              <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"}`}>
                {s.done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`text-xs ${s.done ? "line-through text-gray-400" : "text-gray-600"}`}>{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineAddRow({
  projectSlug,
  column,
  onAdd,
  onClose,
}: {
  projectSlug: string;
  column: string;
  onAdd: (card: Card) => void;
  onClose: () => void;
}) {
  const t = useTranslations("TaskListView");
  const tShared = useTranslations("KanbanShared");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function addSubtask() {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, subtaskInput.trim()]);
    setSubtaskInput("");
    subtaskInputRef.current?.focus();
  }

  function submit() {
    if (!title.trim() || !category) return;
    const allSubs = subtaskInput.trim() ? [...subtasks, subtaskInput.trim()] : subtasks;
    const optimistic: Card = {
      id: `temp-${Date.now()}`,
      projectSlug,
      title: title.trim(),
      description: null,
      dueDate: null,
      column,
      order: 9999,
      priority: "normal",
      category,
      assigneeId: null,
      assignee: null,
      createdById: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      subtasks: allSubs.map((t, i) => ({ id: `temp-sub-${i}`, title: t, done: false, order: i })),
    };
    const t = title.trim();
    onAdd(optimistic);
    startTransition(async () => { await createCard(projectSlug, t, column, undefined, undefined, undefined, undefined, undefined, allSubs.length ? allSubs : undefined, category); });
    setTitle("");
    setCategory("");
    setSubtasks([]);
    setSubtaskInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="border border-blue-200 rounded-lg px-3 py-2 bg-blue-50/30 mt-1 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 shrink-0 rounded border-2 border-gray-200" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); subtaskInputRef.current?.focus(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder={t("taskNamePlaceholder")}
          className="flex-1 text-sm bg-transparent border-0 outline-none placeholder-gray-400 text-gray-800"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          title={!category ? t("categoryRequiredTitle") : undefined}
          className={`text-xs border rounded-md px-1.5 py-1 bg-white focus:outline-none focus:border-blue-400 ${
            category ? "border-gray-200 text-gray-600" : "border-red-300 text-red-500"
          }`}
        >
          <option value="" disabled>{t("categoryOption")}</option>
          {CATEGORY_ORDER.map((key) => (
            <option key={key} value={key}>{tShared(CATEGORY_LABEL_KEYS[key])}</option>
          ))}
        </select>
      </div>

      {subtasks.length > 0 && (
        <ul className="ml-8 space-y-0.5">
          {subtasks.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 h-3 rounded border border-gray-300 shrink-0" />
              <span className="flex-1">{s}</span>
              <button type="button" onClick={() => setSubtasks((p) => p.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 transition-colors">×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 ml-8">
        <input
          ref={subtaskInputRef}
          type="text"
          value={subtaskInput}
          onChange={(e) => setSubtaskInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addSubtask(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder={t("addSubtaskPlaceholder")}
          className="flex-1 text-xs bg-transparent border-0 border-b border-gray-200 focus:border-blue-400 outline-none placeholder-gray-400 text-gray-700 py-0.5"
        />
        <button type="button" onClick={addSubtask} disabled={!subtaskInput.trim()} className="text-blue-500 hover:text-blue-700 disabled:opacity-30 text-xs font-bold px-1">+</button>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={submit}
          disabled={!title.trim() || !category}
          title={!category ? t("selectCategoryTitle") : undefined}
          className="text-xs font-medium bg-seagrass text-white px-3 py-1 rounded-md hover:bg-seagrass/80 disabled:opacity-40 transition-colors"
        >
          {t("addButton")}
        </button>
        <button
          onClick={onClose}
          className="text-xs font-medium text-gray-500 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          {t("cancelButton")}
        </button>
      </div>
    </div>
  );
}
