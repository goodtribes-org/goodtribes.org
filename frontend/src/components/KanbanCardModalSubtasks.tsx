"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import {
  toggleSubtask,
  addSubtask,
  promoteSubtaskToCard,
  deleteSubtask,
  updateSubtaskTitle,
} from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import type { Card, Subtask } from "./kanbanShared";

// Extracted from KanbanCardModal — this widget owns all subtask-list-only
// interaction state (new-subtask input, per-row menu, inline edit) and the
// handlers that operate on it. The `subtasks` array itself stays owned by
// the parent (via `subtasks`/`onChange`) since the parent's save() also
// reads it (to seed a new card's initial subtasks) and its onSubtasksChanged
// effect needs to observe it — this widget is a controlled component, not
// the source of truth.
export default function KanbanCardModalSubtasks({
  subtasks,
  onChange,
  newSubtaskInput,
  onNewSubtaskInputChange,
  canEdit,
  isNew,
  cardId,
  currentUserId,
  canDeleteSubtask,
  onSubtaskAdded,
  onAdd,
}: {
  subtasks: Subtask[];
  onChange: Dispatch<SetStateAction<Subtask[]>>;
  // Controlled from the parent (not owned here) — save()'s isNew path needs
  // to read whatever's typed but not yet added when creating a new card.
  newSubtaskInput: string;
  onNewSubtaskInputChange: (v: string) => void;
  canEdit: boolean;
  isNew?: boolean;
  cardId: string;
  currentUserId: string | null;
  canDeleteSubtask: (s: Subtask) => boolean;
  onSubtaskAdded?: (cardId: string, subtask: Subtask) => void;
  onAdd?: (card: Card) => void;
}) {
  const tCard = useTranslations("KanbanCardModal");
  const [subtaskMenuOpen, setSubtaskMenuOpen] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [, startTransition] = useTransition();

  function handleToggle(s: Subtask) {
    const next = !s.done;
    onChange((prev) => prev.map((t) => t.id === s.id ? { ...t, done: next, completedById: next ? currentUserId : null } : t));
    if (!s.id.startsWith("temp-")) {
      startTransition(async () => {
        try { await toggleSubtask(s.id, next); }
        catch { onChange((prev) => prev.map((t) => t.id === s.id ? { ...t, done: s.done, completedById: s.completedById } : t)); }
      });
    }
  }

  async function handlePromoteSubtask(s: Subtask) {
    if (isNew || s.id.startsWith("temp-")) return;
    onChange((prev) => prev.filter((t) => t.id !== s.id));
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
    onChange((prev) => prev.filter((t) => t.id !== s.id));
    if (!s.id.startsWith("temp-")) {
      const result = await deleteSubtask(s.id);
      if (result && "error" in result) {
        onChange((prev) => [...prev, s]);
        alert(tCard("deleteSubtaskError"));
      }
    }
  }

  async function handleSaveSubtaskEdit(s: Subtask) {
    const newTitle = editingSubtaskTitle.trim();
    if (!newTitle) { setEditingSubtaskId(null); return; }
    onChange((prev) => prev.map((t) => t.id === s.id ? { ...t, title: newTitle } : t));
    setEditingSubtaskId(null);
    if (!s.id.startsWith("temp-")) await updateSubtaskTitle(s.id, newTitle);
  }

  async function handleAddSubtask() {
    if (!newSubtaskInput.trim()) return;
    const title = newSubtaskInput.trim();
    const tempId = `temp-${Date.now()}`;
    onChange((prev) => [...prev, { id: tempId, title, done: false, order: prev.length }]);
    onNewSubtaskInputChange("");
    if (!isNew) {
      const result = await addSubtask(cardId, title);
      if (result && "subtask" in result && result.subtask) {
        const newSubtask = result.subtask as Subtask;
        onChange((prev) => prev.map((s) => s.id === tempId ? newSubtask : s));
        onSubtaskAdded?.(cardId, newSubtask);
      }
    }
  }

  const donePct = subtasks.length > 0
    ? Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tCard("subtasksLabel")}</p>
        <div className="flex items-center gap-3">
          {subtasks.length > 0 && canEdit && !isNew && (
            <button
              type="button"
              onClick={() => {
                const eligible = subtasks.filter((s) => !s.id.startsWith("temp-"));
                eligible.forEach((s) => handlePromoteSubtask(s));
              }}
              className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
              title={tCard("convertAllToCardsTitle")}
            >
              {tCard("convertAllToCardsButton")}
            </button>
          )}
          {subtasks.length > 0 && (
            <span className={`text-xs font-medium ${donePct === 100 ? "text-green-600" : "text-gray-400"}`}>
              {subtasks.filter((s) => s.done).length}/{subtasks.length}
            </span>
          )}
        </div>
      </div>

      {subtasks.length > 0 && (
        <>
          <div className="h-1.5 rounded-full bg-gray-100 mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${donePct === 100 ? "bg-green-500" : "bg-blue-400"}`}
              style={{ width: `${donePct}%` }}
            />
          </div>
          <div className="space-y-1 mb-3">
            {subtasks.map((s) => (
              <SubtaskRow
                key={s.id}
                s={s}
                canEdit={canEdit}
                isNew={isNew}
                canDelete={canDeleteSubtask(s)}
                menuOpen={subtaskMenuOpen === s.id}
                editing={editingSubtaskId === s.id}
                editingTitle={editingSubtaskTitle}
                onToggle={() => canEdit && handleToggle(s)}
                onOpenMenu={() => setSubtaskMenuOpen(subtaskMenuOpen === s.id ? null : s.id)}
                onCloseMenu={() => setSubtaskMenuOpen(null)}
                onStartEdit={() => { setEditingSubtaskId(s.id); setEditingSubtaskTitle(s.title); setSubtaskMenuOpen(null); }}
                onEditingTitleChange={setEditingSubtaskTitle}
                onSaveEdit={() => handleSaveSubtaskEdit(s)}
                onCancelEdit={() => setEditingSubtaskId(null)}
                onDelete={() => { handleDeleteSubtask(s); setSubtaskMenuOpen(null); }}
                onPromote={() => { handlePromoteSubtask(s); setSubtaskMenuOpen(null); }}
                tCard={tCard}
              />
            ))}
          </div>
        </>
      )}

      {canEdit && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newSubtaskInput}
            onChange={(e) => onNewSubtaskInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
            placeholder={tCard("subtaskAddPlaceholder")}
            className="flex-1 text-sm border-0 border-b border-gray-200 focus:border-blue-400 outline-none py-1 placeholder-gray-300 text-gray-700"
          />
          <button
            type="button"
            onClick={handleAddSubtask}
            disabled={!newSubtaskInput.trim()}
            aria-label={tCard("subtaskAddAria")}
            className="text-blue-500 hover:text-blue-700 disabled:opacity-30 font-bold text-lg leading-none"
          >+</button>
        </div>
      )}
    </div>
  );
}

// One subtask row — kept as a plain function (not memoized/exported) purely
// to shrink the parent's render function; it's still recreated on every
// KanbanCardModalSubtasks render same as the inline JSX it replaces.
function SubtaskRow({
  s,
  canEdit,
  isNew,
  canDelete,
  menuOpen,
  editing,
  editingTitle,
  onToggle,
  onOpenMenu,
  onCloseMenu,
  onStartEdit,
  onEditingTitleChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onPromote,
  tCard,
}: {
  s: Subtask;
  canEdit: boolean;
  isNew?: boolean;
  canDelete: boolean;
  menuOpen: boolean;
  editing: boolean;
  editingTitle: string;
  onToggle: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStartEdit: () => void;
  onEditingTitleChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onPromote: () => void;
  tCard: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="relative flex items-center gap-2 group/sub py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={s.done ? tCard("subtaskMarkNotDoneAria") : tCard("subtaskMarkDoneAria")}
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"} ${canEdit ? "cursor-pointer" : "cursor-default"}`}
      >
        {s.done && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          className="flex-1 text-sm border-b border-blue-400 outline-none py-0.5 text-gray-700 bg-white"
          value={editingTitle}
          onChange={(e) => onEditingTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={onSaveEdit}
        />
      ) : (
        <span className={`flex-1 text-sm ${s.done ? "line-through text-gray-400" : "text-gray-700"}`}>{s.title}</span>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={tCard("subtaskMoreOptionsAria")}
          className="opacity-0 group-hover/sub:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity px-1 text-base leading-none"
        >
          •••
        </button>
      )}

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              type="button"
              onClick={onStartEdit}
              className="w-full text-left text-sm px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tCard("subtaskEdit")}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-red-50 transition-colors"
              >
                {tCard("subtaskDelete")}
              </button>
            )}
            {!isNew && !s.id.startsWith("temp-") && (
              <button
                type="button"
                onClick={onPromote}
                className="w-full text-left text-sm px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {tCard("subtaskConvertToOwnCard")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
