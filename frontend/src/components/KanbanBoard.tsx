"use client";

import { useState, useTransition, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createCard, deleteCard, toggleSubtask, updateCard, addSubtask, addComment, deleteComment } from "@/app/projects/[slug]/kanban/actions";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

type CardCreator = { name: string | null };

export type Member = { id: string; name: string | null };

type TaskEstimate = {
  aiHours: number;
  aiConfidence: string;
  aiReasoning: string;
} | null;

type Subtask = { id: string; title: string; done: boolean; order: number };

type Comment = {
  id: string;
  authorId: string;
  author: { id: string; name: string | null };
  body: string;
  createdAt: Date | string;
};

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
  category?: string | null;
  assigneeId: string | null;
  assignee: Member | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: CardCreator | null;
  estimate?: TaskEstimate;
  subtasks?: Subtask[];
  comments?: Comment[];
  aiTaskRuns?: Array<{
    id: string;
    agentType: string;
    status: string;
    outputMarkdown: string | null;
    attemptNumber: number;
    completedAt: Date | string | null;
  }>;
};

const CATEGORY_META: Record<string, { label: string; bg: string; text: string; hex: string }> = {
  teknik:         { label: "Teknik",        bg: "bg-blue-100",   text: "text-blue-700",   hex: "#3b82f6" },
  design:         { label: "Design",        bg: "bg-pink-100",   text: "text-pink-700",   hex: "#ec4899" },
  ekonomi:        { label: "Ekonomi",       bg: "bg-emerald-100",text: "text-emerald-700",hex: "#10b981" },
  strategi:       { label: "Strategi",      bg: "bg-amber-100",  text: "text-amber-700",  hex: "#f59e0b" },
  administration: { label: "Admin",         bg: "bg-slate-100",  text: "text-slate-600",  hex: "#64748b" },
  community:      { label: "Community",     bg: "bg-orange-100", text: "text-orange-700", hex: "#f97316" },
};

const PRIORITY_META: Record<string, { label: string; color: string; dot: string }> = {
  low:    { label: "Low",    color: "text-gray-400", dot: "bg-gray-300" },
  normal: { label: "Normal", color: "text-blue-500", dot: "bg-blue-400" },
  high:   { label: "High",   color: "text-orange-500", dot: "bg-orange-400" },
  urgent: { label: "Urgent", color: "text-red-500", dot: "bg-red-500" },
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

const COLUMNS = [
  { key: "BACKLOG", label: "Backlog", color: "#8b5cf6" },
  { key: "TODO",    label: "ToDo",    color: "#f59e0b" },
  { key: "DOING",   label: "Doing",   color: "#3b82f6" },
  { key: "REVIEW",  label: "Review",  color: "#6b7280" },
  { key: "DONE",    label: "Done",    color: "#10b981" },
];

const COLUMN_ORDER = COLUMNS.map((c) => c.key);

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function Avatar({ name }: { name: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className="w-7 h-7 rounded-full bg-seagrass flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

function toDateInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

function CardDetailModal({
  card,
  members,
  isLoggedIn,
  currentUserId,
  onClose,
  onSaved,
  onDelete,
  onSubtaskAdded,
  isNew,
  onAdd,
  onCardCreated,
}: {
  card: Card;
  members: Member[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
  onDelete: (cardId: string) => void;
  onSubtaskAdded?: (cardId: string, subtask: Subtask) => void;
  isNew?: boolean;
  onAdd?: (card: Card) => void;
  onCardCreated?: (tempId: string, cardId: string) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority] = useState(card.priority);
  const [category, setCategory] = useState(card.category ?? "");
  const [assigneeId, setAssigneeId] = useState(card.assigneeId ?? "");
  const [startDate, setStartDate] = useState(toDateInput(card.startDate));
  const [dueDate, setDueDate] = useState(toDateInput(card.dueDate));
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(card.subtasks ?? []);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<Comment[]>(card.comments ?? []);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [, startTransition] = useTransition();

  const canDelete = currentUserId === card.createdById;

  const columnLabel = COLUMNS.find((c) => c.key === card.column)?.label ?? card.column;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function save() {
    if (!title.trim()) return;
    if (isNew) {
      const subtaskTitles = localSubtasks.map((s) => s.title).filter(Boolean);
      const assignee = members.find((m) => m.id === assigneeId) ?? null;
      onAdd?.({ ...card, title: title.trim(), description: description.trim() || null, priority, category: category || null, assigneeId: assigneeId || null, assignee, subtasks: localSubtasks });
      createCard(
        card.projectSlug,
        title.trim(),
        card.column,
        description.trim() || undefined,
        dueDate || undefined,
        priority,
        assigneeId || undefined,
        startDate || undefined,
        subtaskTitles.length ? subtaskTitles : undefined,
        category || undefined,
      )
        .then((result) => {
          if (result && "cardId" in result) onCardCreated?.(card.id, result.cardId as string);
        })
        .catch(() => {});
    } else {
      startTransition(async () => {
        await updateCard(card.id, {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          category: category || null,
          assigneeId: assigneeId || null,
          startDate: startDate || null,
          dueDate: dueDate || null,
        });
      });
      onSaved(card.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category: category || null,
        assigneeId: assigneeId || null,
      });
    }
    onClose();
  }

  function handleToggle(s: Subtask) {
    setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: !t.done } : t));
    if (!s.id.startsWith("temp-")) {
      startTransition(async () => { await toggleSubtask(s.id, !s.done); });
    }
  }

  async function handleAddSubtask() {
    if (!newSubtaskInput.trim()) return;
    const t = newSubtaskInput.trim();
    const tempId = `temp-${Date.now()}`;
    setLocalSubtasks((prev) => [...prev, { id: tempId, title: t, done: false, order: prev.length }]);
    setNewSubtaskInput("");
    if (!isNew) {
      const result = await addSubtask(card.id, t);
      if (result && "subtask" in result && result.subtask) {
        const newSubtask = result.subtask as Subtask;
        setLocalSubtasks((prev) => prev.map((s) => s.id === tempId ? newSubtask : s));
        onSubtaskAdded?.(card.id, newSubtask);
      }
    }
  }

  const donePct = localSubtasks.length > 0
    ? Math.round((localSubtasks.filter((s) => s.done).length / localSubtasks.length) * 100)
    : 0;

  async function handleSubmitComment() {
    if (!commentBody.trim() || commentBody === "<p></p>") return;
    setSubmittingComment(true);
    const result = await addComment(card.id, commentBody);
    if (result && "comment" in result && result.comment) {
      setComments((prev) => [...prev, result.comment as Comment]);
      setCommentBody("");
    }
    setSubmittingComment(false);
  }

  async function handleDeleteComment(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await deleteComment(commentId);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative ml-auto bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{isNew ? "Nytt kort" : columnLabel}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isLoggedIn}
            rows={2}
            className="w-full text-xl font-semibold text-gray-900 resize-none border-0 outline-none bg-transparent placeholder-gray-300 focus:ring-0"
            placeholder="Kortets titel"
          />

          {/* Metadata grid */}
          <div className="grid grid-cols-[7rem_1fr] gap-y-3 gap-x-3 text-sm">
            <span className="text-gray-400 pt-1">Prioritet</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!isLoggedIn}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-white disabled:opacity-60"
            >
              {Object.entries(PRIORITY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <span className="text-gray-400 pt-2">Kategori</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => isLoggedIn && setCategory("")}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  !category ? "border-gray-400 bg-gray-100 text-gray-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                Ingen
              </button>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => isLoggedIn && setCategory(category === key ? "" : key)}
                  style={category === key ? { backgroundColor: meta.hex + "22", borderColor: meta.hex, color: meta.hex } : {}}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    category === key ? "" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {meta.label}
                </button>
              ))}
            </div>

            <span className="text-gray-400 pt-1">Ansvarig</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={!isLoggedIn}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-white disabled:opacity-60"
            >
              <option value="">— ingen —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
              ))}
            </select>

            <span className="text-gray-400 pt-1">Startdatum</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!isLoggedIn}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 disabled:opacity-60"
            />

            <span className="text-gray-400 pt-1">Slutdatum</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!isLoggedIn}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 disabled:opacity-60"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Beskrivning</p>
            {isLoggedIn ? (
              <RichTextEditor content={description} onChange={setDescription} />
            ) : description ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <p className="text-sm text-gray-300 italic">Ingen beskrivning</p>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deluppgifter</p>
              {localSubtasks.length > 0 && (
                <span className={`text-xs font-medium ${donePct === 100 ? "text-green-600" : "text-gray-400"}`}>
                  {localSubtasks.filter((s) => s.done).length}/{localSubtasks.length}
                </span>
              )}
            </div>

            {localSubtasks.length > 0 && (
              <>
                <div className="h-1.5 rounded-full bg-gray-100 mb-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${donePct === 100 ? "bg-green-500" : "bg-blue-400"}`}
                    style={{ width: `${donePct}%` }}
                  />
                </div>
                <div className="space-y-1 mb-3">
                  {localSubtasks.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => isLoggedIn && handleToggle(s)}
                      className={`flex items-center gap-2.5 w-full text-left py-1 group/sub ${isLoggedIn ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"}`}>
                        {s.done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-sm ${s.done ? "line-through text-gray-400" : "text-gray-700"}`}>{s.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {isLoggedIn && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
                  placeholder="Lägg till deluppgift..."
                  className="flex-1 text-sm border-0 border-b border-gray-200 focus:border-blue-400 outline-none py-1 placeholder-gray-300 text-gray-700"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskInput.trim()}
                  className="text-blue-500 hover:text-blue-700 disabled:opacity-30 font-bold text-lg leading-none"
                >+</button>
              </div>
            )}
          </div>

          {/* Comments */}
          {!isNew && <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Kommentarer{comments.length > 0 ? ` (${comments.length})` : ""}
            </p>

            {comments.length > 0 && (
              <div className="space-y-4 mb-4">
                {comments.map((c) => (
                  <div key={c.id} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-seagrass flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(c.author.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{c.author.name ?? "Okänd"}</span>
                      <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                      {c.authorId === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="ml-auto text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                    <div
                      className="prose prose-sm max-w-none pl-8 text-gray-700"
                      dangerouslySetInnerHTML={{ __html: c.body }}
                    />
                  </div>
                ))}
              </div>
            )}

            {isLoggedIn && (
              <div className="space-y-2">
                <RichTextEditor content={commentBody} onChange={setCommentBody} />
                <button
                  onClick={handleSubmitComment}
                  disabled={submittingComment || !commentBody.trim() || commentBody === "<p></p>"}
                  className="text-sm font-medium bg-seagrass text-white px-4 py-1.5 rounded-lg hover:bg-seagrass/80 disabled:opacity-40 transition-colors"
                >
                  {submittingComment ? "Skickar..." : "Skicka kommentar"}
                </button>
              </div>
            )}
          </div>}
        </div>

        {/* Footer */}
        {isLoggedIn && (
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={save}
              disabled={!title.trim()}
              className="bg-seagrass text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-seagrass/80 disabled:opacity-40 transition-colors"
            >
              {isNew ? "Skapa kort" : "Spara"}
            </button>
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            {canDelete && (
              <div className="ml-auto">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Är du säker?</span>
                    <button
                      onClick={() => { onDelete(card.id); onClose(); }}
                      className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Ja, ta bort
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Ta bort
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


const AGENT_OPTIONS = [
  { value: "writer",     label: "✍️  Skribent — skriver utkast, texter, rapporter" },
  { value: "analyst",    label: "📊 Analytiker — analyserar och drar slutsatser" },
  { value: "researcher", label: "🔍 Researcher — söker och sammanställer information" },
];

function KanbanCardItem({
  card,
  currentUserId,
  onDelete,
  onOpenCard,
  runningAI,
  onRunAI,
}: {
  card: Card;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onOpenCard: (card: Card) => void;
  runningAI: Set<string>;
  onRunAI: (cardId: string, agentType: string, additionalContext: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("writer");
  const [additionalContext, setAdditionalContext] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState(card.subtasks ?? []);
  const [, startTransition] = useTransition();

  const due = formatDate(card.dueDate);
  const priorityMeta = PRIORITY_META[card.priority] ?? PRIORITY_META.normal;

  function roundHalf(n: number) {
    return Math.round(n * 2) / 2;
  }

  const estimateBadgeColor =
    card.estimate?.aiConfidence === "high"
      ? "bg-green-100 text-green-700"
      : card.estimate?.aiConfidence === "medium"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-500";

  const latestAiRun = card.aiTaskRuns?.[0];
  const aiStatus = latestAiRun?.status;
  const isAiRunning = runningAI.has(card.id) || aiStatus === "running";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      onClick={() => onOpenCard(card)}
      suppressHydrationWarning
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-pointer group hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing shrink-0 text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100 touch-none"
            title="Dra för att flytta"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
              <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
              <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
            </svg>
          </span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${priorityMeta.dot}`} title={`Priority: ${priorityMeta.label}`} />
          <p className="text-sm font-medium text-gray-800 leading-snug truncate">{card.title}</p>
        </div>
        <Avatar name={card.assignee?.name ?? card.createdBy?.name ?? null} />
      </div>
      {card.description && (
        <div
          className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2 prose prose-xs max-w-none [&_*]:text-xs [&_*]:text-gray-500 [&_p]:m-0"
          dangerouslySetInnerHTML={{ __html: card.description }}
        />
      )}

      {card.category && CATEGORY_META[card.category] && (
        <div className="mt-2">
          <span
            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_META[card.category].bg} ${CATEGORY_META[card.category].text}`}
          >
            {CATEGORY_META[card.category].label}
          </span>
        </div>
      )}

      {localSubtasks.length > 0 && (
        <div
          className="mt-2 space-y-1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className={`text-xs font-medium ${localSubtasks.every((s) => s.done) ? "text-green-600" : "text-gray-400"}`}>
            {localSubtasks.filter((s) => s.done).length}/{localSubtasks.length} klart
          </span>
          {localSubtasks.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: !t.done } : t));
                if (!s.id.startsWith("temp-")) {
                  startTransition(async () => {
                    await toggleSubtask(s.id, !s.done);
                  });
                }
              }}
              className="flex items-center gap-1.5 w-full text-left group/sub"
            >
              <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"}`}>
                {s.done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`text-xs leading-snug ${s.done ? "line-through text-gray-400" : "text-gray-600"}`}>{s.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* AI status badge */}
      {(isAiRunning || aiStatus === "awaiting_review" || aiStatus === "approved") && (
        <div className="mt-2">
          {isAiRunning && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
              <span className="animate-spin inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full" />
              🤖 AI arbetar...
            </span>
          )}
          {!isAiRunning && aiStatus === "awaiting_review" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              🤖 Väntar på granskning
            </span>
          )}
          {!isAiRunning && aiStatus === "approved" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              🤖 AI godkänd
            </span>
          )}
        </div>
      )}

      <div className="flex items-center mt-2 text-xs text-gray-400">
        {card.assignee ? (
          <span className="truncate">→ {card.assignee.name?.split(" ")[0]}</span>
        ) : (
          <span>{card.createdBy?.name?.split(" ")[0] ?? "Unknown"} · {timeAgo(card.createdAt)}</span>
        )}
        {due && (
          <span className="ml-auto flex items-center gap-1 shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {due}
          </span>
        )}
      </div>
      {card.estimate && (
        <div className="mt-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${estimateBadgeColor}`}
            title={card.estimate.aiReasoning}
          >
            &#9200; ~{roundHalf(card.estimate.aiHours)} h
          </span>
        </div>
      )}

      {/* Tilldela AI button + panel */}
      <div
        className="mt-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          className="text-xs text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); setAiPanelOpen((v) => !v); }}
        >
          🤖 Tilldela AI
        </button>
        {aiPanelOpen && (
          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            {isAiRunning && (
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ Kör inte om kort redan har en aktiv AI-körning
              </p>
            )}
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-purple-400"
            >
              {AGENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Lägg till kontext eller specifika krav..."
              rows={2}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-purple-400 resize-none"
            />
            <button
              disabled={isAiRunning}
              onClick={(e) => {
                e.stopPropagation();
                onRunAI(card.id, selectedAgent, additionalContext);
                setAiPanelOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isAiRunning ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
                  Kör...
                </>
              ) : (
                "Kör AI-agent"
              )}
            </button>
          </div>
        )}
      </div>

      {currentUserId === card.createdById && (
        <button
          className="mt-2 text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Delete
        </button>
      )}
    </div>
  );
}

function DroppableColumn({
  col,
  cards,
  isLoggedIn,
  projectSlug: _projectSlug,
  currentUserId,
  onOpenModal,
  onDelete,
  onOpenCard,
  runningAI,
  onRunAI,
}: {
  col: { key: string; label: string; color: string };
  cards: Card[];
  isLoggedIn: boolean;
  projectSlug: string;
  currentUserId: string | null;
  onOpenModal: (colKey: string) => void;
  onDelete: (id: string) => void;
  onOpenCard: (card: Card) => void;
  runningAI: Set<string>;
  onRunAI: (cardId: string, agentType: string, additionalContext: string) => void;
})
 {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex flex-col flex-1 min-w-52 shrink-0">
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: col.color }} />
      <div
        className="flex items-center justify-between px-3 py-2 border-x border-gray-200 bg-white"
        style={{ borderTop: `1px solid ${col.color}22` }}
      >
        <span className="text-sm font-semibold text-gray-700">
          {col.label}{" "}
          <span className="font-normal text-gray-400">({cards.length})</span>
        </span>
        <div className="flex items-center gap-1">
          {isLoggedIn && (
            <button
              onClick={() => onOpenModal(col.key)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-base font-medium"
            >
              +
            </button>
          )}
          <button className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors tracking-widest text-xs pb-1">
            ···
          </button>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 min-h-32 p-2 border-x border-b border-gray-200 rounded-b-lg flex flex-col gap-2 transition-colors"
          style={{ backgroundColor: isOver ? `${col.color}10` : cards.length === 0 ? "#fafafa" : "white" }}
        >
          {cards.length === 0 && !isOver && (
            <div
              className="flex-1 rounded-md border-2 border-dashed min-h-16"
              style={{ borderColor: `${col.color}33` }}
            />
          )}
          {cards.map((card) => (
            <KanbanCardItem
              key={card.id}
              card={card}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onOpenCard={onOpenCard}
              runningAI={runningAI}
              onRunAI={onRunAI}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
  members,
  requestAddColumn,
  onRequestAddDone,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
  members: Member[];
  requestAddColumn?: string | null;
  onRequestAddDone?: () => void;
}) {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [runningAI, setRunningAI] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function openNewCard(colKey: string) {
    setEditingCard({
      id: `new-${Date.now()}`,
      projectSlug,
      title: "",
      description: null,
      dueDate: null,
      startDate: null,
      column: colKey,
      order: 9999,
      priority: "normal",
      assigneeId: null,
      assignee: null,
      createdById: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      subtasks: [],
      comments: [],
    });
    setIsNewCard(true);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (requestAddColumn) {
      openNewCard(requestAddColumn);
      onRequestAddDone?.();
    }
  }, [requestAddColumn]);

  async function handleRunAI(cardId: string, agentType: string, additionalContext: string) {
    setRunningAI((s) => new Set(s).add(cardId));
    try {
      const res = await fetch("/api/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanbanCardId: cardId, agentType, additionalContext }),
      });
      if (!res.ok) throw new Error(await res.text());
      window.location.reload();
    } catch {
      alert("AI-agenten misslyckades. Kontrollera att ANTHROPIC_API_KEY är konfigurerad.");
      setRunningAI((s) => { const n = new Set(s); n.delete(cardId); return n; });
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function findCardColumn(cardId: string): string | null {
    for (const col of COLUMN_ORDER) {
      if ((columns[col as keyof Columns] as Card[]).some((c) => c.id === cardId)) return col;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const col = findCardColumn(event.active.id as string);
    if (!col) return;
    const card = (columns[col as keyof Columns] as Card[]).find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id as string;
    const overId = over.id as string;
    const sourceCol = findCardColumn(cardId);
    const targetCol = COLUMN_ORDER.includes(overId) ? overId : findCardColumn(overId);
    if (!sourceCol || !targetCol || sourceCol === targetCol) return;
    setColumns((prev) => {
      const card = (prev[sourceCol as keyof Columns] as Card[]).find((c) => c.id === cardId)!;
      return {
        ...prev,
        [sourceCol]: (prev[sourceCol as keyof Columns] as Card[]).filter((c) => c.id !== cardId),
        [targetCol]: [...(prev[targetCol as keyof Columns] as Card[]), { ...card, column: targetCol }],
      };
    });
    fetch("/api/kanban/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, newColumn: targetCol }),
      keepalive: true,
    });
  }

  function handleAdd(card: Card) {
    setColumns((prev) => ({
      ...prev,
      [card.column]: [...(prev[card.column as keyof Columns] as Card[]), card],
    }));
  }

  function handleDelete(cardId: string) {
    const col = findCardColumn(cardId);
    if (!col) return;
    setColumns((prev) => ({
      ...prev,
      [col]: (prev[col as keyof Columns] as Card[]).filter((c) => c.id !== cardId),
    }));
    startTransition(async () => { await deleteCard(cardId); });
  }

  function handleCardSaved(cardId: string, patch: Partial<Card>) {
    setColumns((prev) => {
      const updated = { ...prev };
      for (const key of COLUMN_ORDER) {
        const col = key as keyof Columns;
        const idx = (updated[col] as Card[]).findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          const cards = [...(updated[col] as Card[])];
          cards[idx] = { ...cards[idx], ...patch };
          updated[col] = cards as typeof updated[typeof col];
          break;
        }
      }
      return updated;
    });
  }

  function handleSubtaskAdded(cardId: string, subtask: Subtask) {
    setColumns((prev) => {
      const updated = { ...prev };
      for (const key of COLUMN_ORDER) {
        const col = key as keyof Columns;
        const idx = (updated[col] as Card[]).findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          const cards = [...(updated[col] as Card[])];
          cards[idx] = { ...cards[idx], subtasks: [...(cards[idx].subtasks ?? []), subtask] };
          updated[col] = cards as typeof updated[typeof col];
          break;
        }
      }
      return updated;
    });
  }

  function handleTempCardResolved(tempId: string, cardId: string) {
    setColumns((prev) => {
      const updated = { ...prev };
      for (const key of COLUMN_ORDER) {
        const col = key as keyof Columns;
        const idx = (updated[col] as Card[]).findIndex((c) => c.id === tempId);
        if (idx !== -1) {
          const cards = [...(updated[col] as Card[])];
          cards[idx] = { ...cards[idx], id: cardId };
          updated[col] = cards as typeof updated[typeof col];
          break;
        }
      }
      return updated;
    });
  }

  return (
    <div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 w-full">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.key}
                col={col}
                cards={columns[col.key as keyof Columns] as Card[]}
                isLoggedIn={isLoggedIn}
                projectSlug={projectSlug}
                currentUserId={currentUserId}
                onOpenModal={openNewCard}
                onDelete={handleDelete}
                onOpenCard={setEditingCard}
                runningAI={runningAI}
                onRunAI={handleRunAI}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl rotate-1 w-72">
              <p className="text-sm font-medium text-gray-800">{activeCard.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {editingCard && (
        <CardDetailModal
          card={editingCard}
          members={members}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          onClose={() => { setEditingCard(null); setIsNewCard(false); }}
          onSaved={handleCardSaved}
          onDelete={(cardId) => { handleDelete(cardId); setEditingCard(null); setIsNewCard(false); }}
          onSubtaskAdded={handleSubtaskAdded}
          isNew={isNewCard}
          onAdd={handleAdd}
          onCardCreated={handleTempCardResolved}
        />
      )}
    </div>
  );
}
