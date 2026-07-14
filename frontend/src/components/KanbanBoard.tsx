"use client";

import React, { useState, useTransition, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { createCard, deleteCard, toggleSubtask, updateCard, addSubtask, addComment, deleteComment, toggleCardLike, promoteSubtaskToCard, deleteSubtask, updateSubtaskTitle } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { htmlToPreviewText } from "@/lib/renderBody";
import { toProxyUrl } from "@/lib/storageUrl";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

type CardCreator = { name: string | null; image?: string | null };

export type Member = { id: string; name: string | null; image?: string | null };

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
  likeCount?: number;
  likedByMe?: boolean;
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
  likeCount?: number;
  likedByMe?: boolean;
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

const PRIORITY_META: Record<string, { label: string; color: string; dot: string; bottomHex: string }> = {
  low:    { label: "Low",    color: "text-gray-400",   dot: "bg-gray-300",   bottomHex: "#d1d5db" },
  normal: { label: "Normal", color: "text-blue-500",   dot: "bg-blue-400",   bottomHex: "#60a5fa" },
  high:   { label: "High",   color: "text-orange-500", dot: "bg-orange-400", bottomHex: "#fb923c" },
  urgent: { label: "Urgent", color: "text-red-500",    dot: "bg-red-500",    bottomHex: "#ef4444" },
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

const COLUMNS = [
  { key: "BACKLOG", label: "Backlog", color: "#ef4444" },
  { key: "TODO",    label: "ToDo",    color: "#f97316" },
  { key: "DOING",   label: "Doing",   color: "#facc15" },
  { key: "REVIEW",  label: "Review",  color: "#3b82f6" },
  { key: "DONE",    label: "Done",    color: "#16a34a" },
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

function Avatar({ name, image }: { name: string | null; image?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  if (image && !imgFailed) {
    return (
      <img
        src={toProxyUrl(image)}
        alt={name ?? ""}
        className="w-5 h-5 rounded-full object-cover shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-seagrass flex items-center justify-center text-white text-[9px] font-bold shrink-0">
      {initials}
    </div>
  );
}

function toDateInput(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().slice(0, 10);
}

class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError(error: unknown) {
    if (typeof window !== "undefined" && error instanceof Error && error.name === "ChunkLoadError") {
      window.location.reload();
    }
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

function CardDetailModal({
  card,
  members,
  isLoggedIn,
  currentUserId,
  isMember,
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
  isMember: boolean;
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
  const [subtaskMenuOpen, setSubtaskMenuOpen] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<Comment[]>(card.comments ?? []);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [cardLiked, setCardLiked] = useState(!!card.likedByMe);
  const [cardLikeCount, setCardLikeCount] = useState(card.likeCount ?? 0);
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
      const pendingSubtask = newSubtaskInput.trim();
      const allSubtasks = pendingSubtask
        ? [...localSubtasks, { id: `temp-${Date.now()}`, title: pendingSubtask, done: false, order: localSubtasks.length }]
        : localSubtasks;
      const subtaskTitles = allSubtasks.map((s) => s.title).filter(Boolean);
      const assignee = members.find((m) => m.id === assigneeId) ?? null;
      onAdd?.({ ...card, title: title.trim(), description: description.trim() || null, priority, category: category || null, assigneeId: assigneeId || null, assignee, subtasks: allSubtasks });
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
        try {
          await updateCard(card.id, {
            title: title.trim(),
            description: description.trim() || null,
            priority,
            category: category || null,
            assigneeId: assigneeId || null,
            startDate: startDate || null,
            dueDate: dueDate || null,
          });
        } catch { /* server error — optimistic update stays, page won't crash */ }
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
      startTransition(async () => {
        try { await toggleSubtask(s.id, !s.done); }
        catch { setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: s.done } : t)); }
      });
    }
  }

  async function handlePromoteSubtask(s: Subtask) {
    if (isNew || s.id.startsWith("temp-")) return;
    setLocalSubtasks((prev) => prev.filter((t) => t.id !== s.id));
    const result = await promoteSubtaskToCard(s.id);
    if (result && "card" in result && result.card) {
      const c = result.card;
      onAdd?.({
        id: c.id,
        projectSlug: c.projectSlug,
        title: c.title,
        description: null,
        dueDate: null,
        startDate: null,
        column: c.column,
        order: c.order,
        priority: c.priority,
        category: c.category ?? null,
        assigneeId: null,
        assignee: null,
        createdById: c.createdById,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        createdBy: null,
        subtasks: [],
        comments: [],
      });
    }
  }

  async function handleDeleteSubtask(s: Subtask) {
    setLocalSubtasks((prev) => prev.filter((t) => t.id !== s.id));
    if (!s.id.startsWith("temp-")) await deleteSubtask(s.id);
  }

  async function handleSaveSubtaskEdit(s: Subtask) {
    const newTitle = editingSubtaskTitle.trim();
    if (!newTitle) { setEditingSubtaskId(null); return; }
    setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, title: newTitle } : t));
    setEditingSubtaskId(null);
    if (!s.id.startsWith("temp-")) await updateSubtaskTitle(s.id, newTitle);
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
    if (!commentBody.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    const result = await addComment(card.id, commentBody);
    if (result && "comment" in result && result.comment) {
      const newComment = result.comment as Comment;
      const next = [...comments, newComment];
      setComments(next);
      onSaved(card.id, { comments: next });
      setCommentBody("");
    } else if (result && "error" in result) {
      setCommentError(
        result.error === "Not a project member"
          ? "Du måste vara medlem i projektet för att kommentera."
          : result.error
      );
    }
    setSubmittingComment(false);
  }

  async function handleDeleteComment(commentId: string) {
    const next = comments.filter((c) => c.id !== commentId);
    setComments(next);
    onSaved(card.id, { comments: next });
    await deleteComment(commentId);
  }

  function handleToggleCardLike() {
    if (!isLoggedIn || !isMember) return;
    const nextLiked = !cardLiked;
    const nextCount = cardLikeCount + (cardLiked ? -1 : 1);
    setCardLikeCount(nextCount);
    setCardLiked(nextLiked);
    onSaved(card.id, { likedByMe: nextLiked, likeCount: nextCount });
    startTransition(async () => { await toggleCardLike(card.id); });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col rounded-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{isNew ? "Nytt kort" : columnLabel}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pt-3 pb-5 space-y-1">
          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isLoggedIn}
            rows={1}
            className="w-full text-lg font-semibold text-gray-900 resize-none border-0 outline-none bg-transparent placeholder-gray-300 focus:ring-0 leading-tight"
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
              <div className="flex items-center gap-3">
                {localSubtasks.length > 0 && isLoggedIn && !isNew && (
                  <button
                    type="button"
                    onClick={() => {
                      const eligible = localSubtasks.filter((s) => !s.id.startsWith("temp-"));
                      eligible.forEach((s) => handlePromoteSubtask(s));
                    }}
                    className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                    title="Gör om alla deluppgifter till egna kanban-kort"
                  >
                    Gör om alla till kort
                  </button>
                )}
                {localSubtasks.length > 0 && (
                  <span className={`text-xs font-medium ${donePct === 100 ? "text-green-600" : "text-gray-400"}`}>
                    {localSubtasks.filter((s) => s.done).length}/{localSubtasks.length}
                  </span>
                )}
              </div>
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
                    <div key={s.id} className="relative flex items-center gap-2 group/sub py-1">
                      <button
                        type="button"
                        onClick={() => isLoggedIn && handleToggle(s)}
                        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"} ${isLoggedIn ? "cursor-pointer" : "cursor-default"}`}
                      >
                        {s.done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {editingSubtaskId === s.id ? (
                        <input
                          autoFocus
                          className="flex-1 text-sm border-b border-blue-400 outline-none py-0.5 text-gray-700 bg-transparent"
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveSubtaskEdit(s);
                            if (e.key === "Escape") setEditingSubtaskId(null);
                          }}
                          onBlur={() => handleSaveSubtaskEdit(s)}
                        />
                      ) : (
                        <span className={`flex-1 text-sm ${s.done ? "line-through text-gray-400" : "text-gray-700"}`}>{s.title}</span>
                      )}

                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={() => setSubtaskMenuOpen(subtaskMenuOpen === s.id ? null : s.id)}
                          className="opacity-0 group-hover/sub:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity px-1 text-base leading-none"
                        >
                          •••
                        </button>
                      )}

                      {subtaskMenuOpen === s.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setSubtaskMenuOpen(null)} />
                          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                            <button
                              type="button"
                              onClick={() => { setEditingSubtaskId(s.id); setEditingSubtaskTitle(s.title); setSubtaskMenuOpen(null); }}
                              className="w-full text-left text-sm px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Ändra
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleDeleteSubtask(s); setSubtaskMenuOpen(null); }}
                              className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              Ta bort
                            </button>
                            {!isNew && !s.id.startsWith("temp-") && (
                              <button
                                type="button"
                                onClick={() => { handlePromoteSubtask(s); setSubtaskMenuOpen(null); }}
                                className="w-full text-left text-sm px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                Eget kort
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
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
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={handleToggleCardLike}
                disabled={!isLoggedIn || !isMember}
                title={
                  !isLoggedIn
                    ? "Logga in för att gilla"
                    : !isMember
                    ? "Bli medlem i projektet för att gilla"
                    : cardLiked
                    ? "Ta bort gillning"
                    : "Gilla"
                }
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                  cardLiked ? "text-coral" : "text-gray-400 hover:text-coral"
                } ${!isLoggedIn || !isMember ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <svg className="w-4 h-4" fill={cardLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-8.53a2 2 0 01-2-2v-7a2 2 0 012-2h2.5m4-6l-1 5h6a1 1 0 011 1v1m-7-7v7m0-7L9 4" />
                </svg>
                Gilla{cardLikeCount > 0 ? ` (${cardLikeCount})` : ""}
              </button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Kommentarer{comments.length > 0 ? ` (${comments.length})` : ""}
              </p>
            </div>

            {comments.length > 0 && (
              <div className="space-y-2 mb-3">
                {comments.map((c) => (
                  <div key={c.id} className="group bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs">
                      <span className="font-semibold text-gray-700">{c.author.name ?? "Okänd"}</span>{" "}
                      <span className="text-gray-400">· {timeAgo(c.createdAt)}</span>
                      {c.authorId === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="ml-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ta bort
                        </button>
                      )}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">{htmlToPreviewText(c.body)}</p>
                  </div>
                ))}
              </div>
            )}

            {isLoggedIn && isMember ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }} className="flex gap-2">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={1}
                  placeholder="Skriv en kommentar..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentBody.trim()}
                  className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
                >
                  {submittingComment ? "Skickar..." : "Skicka"}
                </button>
              </form>
            ) : !isLoggedIn ? (
              <p className="text-xs text-gray-400">Logga in för att kommentera.</p>
            ) : (
              <p className="text-xs text-gray-400">Bli medlem i projektet för att kommentera.</p>
            )}
            {commentError && <p className="text-xs text-red-500 mt-1">{commentError}</p>}
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

function KanbanCardComments({
  card,
  isLoggedIn,
  isMember,
  onSaved,
}: {
  card: Card;
  isLoggedIn: boolean;
  isMember: boolean;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
}) {
  const [comments, setComments] = useState<Comment[]>(card.comments ?? []);
  const [showComments, setShowComments] = useState(false);
  const [pendingComment, setPendingComment] = useState(false);
  const [liked, setLiked] = useState(!!card.likedByMe);
  const [likeCount, setLikeCount] = useState(card.likeCount ?? 0);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setComments(card.comments ?? []); }, [card.comments]);
  useEffect(() => { setLiked(!!card.likedByMe); setLikeCount(card.likeCount ?? 0); }, [card.likedByMe, card.likeCount]);

  const canInteract = isLoggedIn && isMember;

  function handleLike() {
    if (!canInteract) return;
    const nextLiked = !liked;
    const nextCount = likeCount + (liked ? -1 : 1);
    setLikeCount(nextCount);
    setLiked(nextLiked);
    onSaved(card.id, { likedByMe: nextLiked, likeCount: nextCount });
    startTransition(async () => { await toggleCardLike(card.id); });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = ref.current?.value.trim() ?? "";
    if (!body || !canInteract) return;
    if (ref.current) ref.current.value = "";
    setPendingComment(true);
    startTransition(async () => {
      const result = await addComment(card.id, body);
      if (result && "comment" in result && result.comment) {
        const newComment = result.comment as Comment;
        const next = [...comments, newComment];
        setComments(next);
        onSaved(card.id, { comments: next });
      }
      setPendingComment(false);
    });
  }

  return (
    <div
      className="mt-1 pt-1 border-t border-gray-100"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={!canInteract}
          title={
            !isLoggedIn
              ? "Logga in för att gilla"
              : !isMember
              ? "Bli medlem i projektet för att gilla"
              : liked
              ? "Ta bort gillning"
              : "Gilla"
          }
          className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${
            liked ? "text-coral" : "text-gray-400 hover:text-coral"
          } ${!canInteract ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <svg className="w-3 h-3" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-8.53a2 2 0 01-2-2v-7a2 2 0 012-2h2.5m4-6l-1 5h6a1 1 0 011 1v1m-7-7v7m0-7L9 4" />
          </svg>
          Gilla{likeCount > 0 ? ` (${likeCount})` : ""}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-seagrass transition-colors cursor-pointer"
        >
          💬 Kommentera{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
      </div>

      {showComments && (
        <div className="mt-1.5 space-y-1.5">
          {comments.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-md px-2 py-1">
              <p className="text-[10px]">
                <span className="font-semibold text-gray-700">{c.author.name ?? "Okänd"}</span>{" "}
                <span className="text-gray-400">· {timeAgo(c.createdAt)}</span>
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">{htmlToPreviewText(c.body)}</p>
            </div>
          ))}
          {canInteract ? (
            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <textarea
                ref={ref}
                rows={1}
                placeholder="Skriv en kommentar..."
                className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-coral resize-none"
              />
              <button
                type="submit"
                disabled={pendingComment}
                className="px-2 py-1 bg-coral text-white text-[10px] font-medium rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                Skicka
              </button>
            </form>
          ) : !isLoggedIn ? (
            <p className="text-[10px] text-gray-400">Logga in för att kommentera.</p>
          ) : (
            <p className="text-[10px] text-gray-400">Bli medlem i projektet för att kommentera.</p>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanCardItem({
  card,
  currentUserId,
  isLoggedIn,
  isMember,
  onDelete,
  onOpenCard,
  onAddCard,
  runningAI,
  onRunAI,
  onSubtasksChanged,
  onSaved,
}: {
  card: Card;
  currentUserId: string | null;
  isLoggedIn: boolean;
  isMember: boolean;
  onDelete: (id: string) => void;
  onOpenCard: (card: Card) => void;
  onAddCard?: (card: Card) => void;
  runningAI: Set<string>;
  onRunAI: (cardId: string, agentType: string, additionalContext: string) => void;
  onSubtasksChanged?: (cardId: string, subtasks: Subtask[]) => void;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("writer");
  const [additionalContext, setAdditionalContext] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState(card.subtasks ?? []);
  const subtasksMountedRef = useRef(false);

  useEffect(() => {
    setLocalSubtasks(card.subtasks ?? []);
  }, [card.subtasks]);

  useEffect(() => {
    if (!subtasksMountedRef.current) { subtasksMountedRef.current = true; return; }
    onSubtasksChanged?.(card.id, localSubtasks);
  }, [localSubtasks, card.id, onSubtasksChanged]);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [subtaskMenuPos, setSubtaskMenuPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [, startTransition] = useTransition();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [descTip, setDescTip] = useState<{ x: number; y: number } | null>(null);

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

  const categoryHex = card.category ? CATEGORY_META[card.category]?.hex : null;

  async function handleQuickAddSubtask() {
    if (!newSubtaskInput.trim() || card.id.startsWith("new-")) return;
    const title = newSubtaskInput.trim();
    const tempId = `temp-${Date.now()}`;
    setLocalSubtasks((prev) => [...prev, { id: tempId, title, done: false, order: prev.length }]);
    setNewSubtaskInput("");
    const result = await addSubtask(card.id, title);
    if (result && "subtask" in result && result.subtask) {
      const real = result.subtask as Subtask;
      setLocalSubtasks((prev) => prev.map((s) => s.id === tempId ? real : s));
    }
  }

  async function handleCardDeleteSubtask(s: Subtask) {
    setLocalSubtasks((prev) => prev.filter((t) => t.id !== s.id));
    if (!s.id.startsWith("temp-")) await deleteSubtask(s.id);
  }

  async function handleCardSaveSubtaskEdit(s: Subtask) {
    const newTitle = editingSubtaskTitle.trim();
    if (!newTitle) { setEditingSubtaskId(null); return; }
    setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, title: newTitle } : t));
    setEditingSubtaskId(null);
    if (!s.id.startsWith("temp-")) await updateSubtaskTitle(s.id, newTitle);
  }

  async function handleCardPromoteSubtask(s: Subtask) {
    if (s.id.startsWith("temp-")) return;
    setLocalSubtasks((prev) => prev.filter((t) => t.id !== s.id));
    const result = await promoteSubtaskToCard(s.id);
    if (result && "card" in result && result.card) {
      const c = result.card;
      onAddCard?.({
        id: c.id, projectSlug: c.projectSlug, title: c.title,
        description: null, dueDate: null, startDate: null,
        column: c.column, order: c.order, priority: c.priority,
        category: c.category ?? null, assigneeId: null, assignee: null,
        createdById: c.createdById, createdAt: c.createdAt, updatedAt: c.updatedAt,
        createdBy: null, subtasks: [], comments: [],
      });
    }
  }

  return (
    <div
      className="relative"
      onMouseLeave={() => setDescTip(null)}
    >
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, borderBottomColor: priorityMeta.bottomHex }}
      {...attributes}
      {...listeners}
      suppressHydrationWarning
      className="bg-white border border-gray-200 rounded-lg shadow-sm group hover:shadow-md hover:border-gray-300 transition-all overflow-hidden"
    >
      {categoryHex && (
        <div className="h-1" style={{ backgroundColor: categoryHex }} title={CATEGORY_META[card.category!].label} />
      )}
      <div className="px-2 py-1.5">
        <div
          className="flex gap-1.5 items-start"
          onMouseEnter={(e) => { if (card.description) setDescTip({ x: e.clientX, y: e.clientY }); }}
          onMouseMove={(e) => { if (descTip) setDescTip({ x: e.clientX, y: e.clientY }); }}
        >
          {/* Vänster: titel + metadata */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 leading-snug truncate">{card.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {(card.startDate || card.dueDate) ? (
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  Dates: {[formatDate(card.startDate ?? null), formatDate(card.dueDate)].filter(Boolean).join(" – ")}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  Created: {formatDate(card.createdAt)}
                </span>
              )}
              {localSubtasks.length > 0 && (
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  {localSubtasks.filter((s) => s.done).length}/{localSubtasks.length} klara
                </span>
              )}
            </div>
          </div>

          {/* Höger: avatar, sedan + knapp med pil rakt under */}
          <div className="shrink-0 flex items-start gap-1">
            <Avatar
              name={card.assignee?.name ?? card.createdBy?.name ?? null}
              image={card.assignee?.image ?? card.createdBy?.image ?? null}
            />
            {/* + knapp + pil staplade */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenCard(card); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                title="Ändra"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 4v16M4 12h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDetailsExpanded((v) => !v); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                title="Visa detaljer"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${detailsExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <KanbanCardComments card={card} isLoggedIn={isLoggedIn} isMember={isMember} onSaved={onSaved} />

        {/* Expanderat block */}
        <div>

          {detailsExpanded && (
            <div
              className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5"
              onMouseEnter={() => setDescTip(null)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {localSubtasks.length > 0 && (
                <>
                  <span className={`text-xs font-medium ${localSubtasks.every((s) => s.done) ? "text-green-600" : "text-gray-400"}`}>
                    {localSubtasks.filter((s) => s.done).length}/{localSubtasks.length} klart
                  </span>
                  {localSubtasks.map((s) => (
                    <div key={s.id} className="relative flex items-center gap-1.5 group/sub py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: !t.done } : t));
                          if (!s.id.startsWith("temp-")) startTransition(async () => {
                            try { await toggleSubtask(s.id, !s.done); }
                            catch { setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: s.done } : t)); }
                          });
                        }}
                        className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"}`}
                      >
                        {s.done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>

                      {editingSubtaskId === s.id ? (
                        <input
                          autoFocus
                          className="flex-1 text-xs border-b border-blue-400 outline-none bg-transparent text-gray-700 py-0"
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCardSaveSubtaskEdit(s); if (e.key === "Escape") setEditingSubtaskId(null); }}
                          onBlur={() => handleCardSaveSubtaskEdit(s)}
                        />
                      ) : (
                        <span className={`flex-1 text-xs leading-snug ${s.done ? "line-through text-gray-400" : "text-gray-600"}`}>{s.title}</span>
                      )}

                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setSubtaskMenuPos(subtaskMenuPos?.id === s.id ? null : { id: s.id, x: rect.right, y: rect.bottom });
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover/sub:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity text-xs leading-none px-0.5"
                        >
                          •••
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {isLoggedIn && !addingSubtask && (
                <button
                  type="button"
                  onClick={() => setAddingSubtask(true)}
                  className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-all"
                >
                  <span className="text-base leading-none font-light">+</span> Lägg till uppgift
                </button>
              )}

              {isLoggedIn && addingSubtask && (
                <div className="mt-1 flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { handleQuickAddSubtask(); }
                      if (e.key === "Escape") { setAddingSubtask(false); setNewSubtaskInput(""); }
                    }}
                    onBlur={() => { if (!newSubtaskInput.trim()) setAddingSubtask(false); else handleQuickAddSubtask().then(() => setAddingSubtask(false)); }}
                    placeholder="Ny uppgift..."
                    className="flex-1 text-xs border-b border-blue-400 outline-none py-0.5 placeholder-gray-300 bg-transparent text-gray-700"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    {subtaskMenuPos && (() => {
      const s = localSubtasks.find((t) => t.id === subtaskMenuPos.id);
      if (!s) return null;
      return createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSubtaskMenuPos(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
            style={{ right: window.innerWidth - subtaskMenuPos.x, top: subtaskMenuPos.y + 4 }}
          >
            <button type="button" onClick={() => { setEditingSubtaskId(s.id); setEditingSubtaskTitle(s.title); setSubtaskMenuPos(null); }} className="w-full text-left text-xs px-3 py-1.5 text-gray-700 hover:bg-gray-50">Ändra</button>
            <button type="button" onClick={() => { handleCardDeleteSubtask(s); setSubtaskMenuPos(null); }} className="w-full text-left text-xs px-3 py-1.5 text-red-500 hover:bg-red-50">Ta bort</button>
            {!s.id.startsWith("temp-") && (
              <button type="button" onClick={() => { handleCardPromoteSubtask(s); setSubtaskMenuPos(null); }} className="w-full text-left text-xs px-3 py-1.5 text-gray-700 hover:bg-gray-50">Eget kort</button>
            )}
          </div>
        </>,
        document.body
      );
    })()}
    {descTip && card.description && createPortal(
      <div
        className="fixed z-[9999] pointer-events-none bg-dark-slate text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[260px]"
        style={{ left: descTip.x + 14, top: descTip.y - 10 }}
      >
        <div
          className="prose prose-xs max-w-none [&_*]:text-white/80 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-white line-clamp-8"
          dangerouslySetInnerHTML={{ __html: card.description }}
        />
      </div>,
      document.body
    )}
    </div>
  );
}

function DroppableColumn({
  col,
  cards,
  isLoggedIn,
  isMember,
  projectSlug: _projectSlug,
  currentUserId,
  onOpenModal,
  onDelete,
  onOpenCard,
  onAddCard,
  runningAI,
  onRunAI,
  onSubtasksChanged,
  onSaved,
}: {
  col: { key: string; label: string; color: string };
  cards: Card[];
  isLoggedIn: boolean;
  isMember: boolean;
  projectSlug: string;
  currentUserId: string | null;
  onOpenModal: (colKey: string) => void;
  onDelete: (id: string) => void;
  onOpenCard: (card: Card) => void;
  onAddCard: (card: Card) => void;
  runningAI: Set<string>;
  onRunAI: (cardId: string, agentType: string, additionalContext: string) => void;
  onSubtasksChanged: (cardId: string, subtasks: Subtask[]) => void;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
})
 {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex flex-col flex-1 min-w-52 shrink-0">
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: col.color }} />
      <div
        className="flex items-center justify-between px-3 py-2 border-x border-gray-200"
        style={{ backgroundColor: `${col.color}12`, borderTop: `1px solid ${col.color}22` }}
      >
        <span className="text-sm font-semibold text-gray-700">
          {col.label}{" "}
          <span className="font-normal text-gray-400">({cards.length})</span>
        </span>
        <div className="flex items-center gap-1">
          {isLoggedIn && (
            <button
              onClick={() => onOpenModal(col.key)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200 transition-all"
              title="Lägg till kort"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Lägg till
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
          style={{ backgroundColor: isOver ? `${col.color}30` : `${col.color}12` }}
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
              isLoggedIn={isLoggedIn}
              isMember={isMember}
              onDelete={onDelete}
              onOpenCard={onOpenCard}
              onAddCard={onAddCard}
              runningAI={runningAI}
              onRunAI={onRunAI}
              onSubtasksChanged={onSubtasksChanged}
              onSaved={onSaved}
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
  isMember,
  members,
  requestAddColumn,
  onRequestAddDone,
  requestOpenCardId,
  viewToggle,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
  isMember: boolean;
  members: Member[];
  requestAddColumn?: string | null;
  onRequestAddDone?: () => void;
  requestOpenCardId?: string | null;
  viewToggle?: React.ReactNode;
}) {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [runningAI, setRunningAI] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!requestOpenCardId) return;
    const found = Object.values(columns).flat().find((c) => c.id === requestOpenCardId);
    if (found) setEditingCard(found);
  }, [requestOpenCardId]);

  const hasFilters = !!(filterQuery || filterCategory || filterPriority || filterAssignee);

  const filteredColumns = useMemo(() => {
    const q = filterQuery.toLowerCase();
    const apply = (cards: Card[]) => cards.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q)) return false;
      if (filterCategory && c.category !== filterCategory) return false;
      if (filterPriority && c.priority !== filterPriority) return false;
      if (filterAssignee && c.assigneeId !== filterAssignee) return false;
      return true;
    });
    return {
      BACKLOG: apply(columns.BACKLOG),
      TODO:    apply(columns.TODO),
      DOING:   apply(columns.DOING),
      REVIEW:  apply(columns.REVIEW),
      DONE:    apply(columns.DONE),
    };
  }, [columns, filterQuery, filterCategory, filterPriority, filterAssignee]);

  const totalVisible = hasFilters
    ? Object.values(filteredColumns).reduce((s, c) => s + c.length, 0)
    : null;
  const totalCards = Object.values(columns).reduce((s, c) => s + c.length, 0);

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
    startTransition(async () => { try { await deleteCard(cardId); } catch { /* ignore */ } });
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

  const handleCardSubtasksSynced = useCallback((cardId: string, subtasks: Subtask[]) => {
    setColumns((prev) => {
      for (const key of COLUMN_ORDER) {
        const col = key as keyof Columns;
        const idx = (prev[col] as Card[]).findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          if ((prev[col] as Card[])[idx].subtasks === subtasks) return prev;
          const cards = [...(prev[col] as Card[])];
          cards[idx] = { ...cards[idx], subtasks };
          return { ...prev, [col]: cards };
        }
      }
      return prev;
    });
  }, []);

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
      {/* Toolbar: add button left, filters centered */}
      <div className="flex items-center gap-3 mb-4">
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => openNewCard("BACKLOG")}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-coral text-white hover:bg-watermelon transition-colors shrink-0"
          >
            <span className="text-base leading-none font-light">+</span> Lägg till kort
          </button>
        )}

        <div className="flex flex-1 items-center justify-center gap-2 flex-wrap min-w-0">
          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">Alla kategorier</option>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">Alla prioriteter</option>
            {Object.entries(PRIORITY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          {/* Assignee */}
          {members.length > 0 && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-blue-400"
            >
              <option value="">Alla ansvariga</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
              ))}
            </select>
          )}

          {/* Search */}
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Sök kort…"
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 w-36"
          />

          {/* Clear + count */}
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setFilterQuery(""); setFilterCategory(""); setFilterPriority(""); setFilterAssignee(""); }}
              className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors"
            >
              Rensa
            </button>
          )}
          {totalVisible !== null && (
            <span className="text-xs text-gray-400">{totalVisible}/{totalCards}</span>
          )}
        </div>

        {viewToggle && <div className="shrink-0">{viewToggle}</div>}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 w-full">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.key}
                col={col}
                cards={filteredColumns[col.key as keyof Columns] as Card[]}
                isLoggedIn={isLoggedIn}
                isMember={isMember}
                projectSlug={projectSlug}
                currentUserId={currentUserId}
                onOpenModal={openNewCard}
                onDelete={handleDelete}
                onOpenCard={setEditingCard}
                onAddCard={handleAdd}
                runningAI={runningAI}
                onRunAI={handleRunAI}
                onSubtasksChanged={handleCardSubtasksSynced}
                onSaved={handleCardSaved}
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

      <ChunkErrorBoundary>
        {editingCard && (
          <CardDetailModal
            card={editingCard}
            members={members}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
            isMember={isMember}
            onClose={() => { setEditingCard(null); setIsNewCard(false); }}
            onSaved={handleCardSaved}
            onDelete={(cardId) => { handleDelete(cardId); setEditingCard(null); setIsNewCard(false); }}
            onSubtaskAdded={handleSubtaskAdded}
            isNew={isNewCard}
            onAdd={handleAdd}
            onCardCreated={handleTempCardResolved}
          />
        )}
      </ChunkErrorBoundary>
    </div>
  );
}
