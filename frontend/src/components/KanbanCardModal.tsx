"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  createCard,
  toggleSubtask,
  updateCard,
  addSubtask,
  promoteSubtaskToCard,
  deleteSubtask,
  updateSubtaskTitle,
  claimCard,
  abandonCard,
  setCardOpenToPublic,
} from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import GithubCardMeta, { isGithubCard } from "@/components/GithubCardMeta";
import KanbanCardModalComments from "@/components/KanbanCardModalComments";
import {
  CATEGORY_META,
  PRIORITY_META,
  PRIORITY_LABEL_KEYS,
  COLUMNS,
  toDateInput,
  type Card,
  type Member,
  type Subtask,
} from "./kanbanShared";
import { CATEGORY_LABEL_KEYS } from "@/lib/kanbanCategories";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function CardDetailModalImpl({
  card,
  members,
  isLoggedIn,
  currentUserId,
  isMember,
  isLead,
  onClose,
  onSaved,
  onDelete,
  onSubtaskAdded,
  onSubtasksChanged,
  isNew,
  onAdd,
}: {
  card: Card;
  members: Member[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  isMember: boolean;
  isLead: boolean;
  onClose: () => void;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
  onDelete: (cardId: string) => void;
  onSubtaskAdded?: (cardId: string, subtask: Subtask) => void;
  onSubtasksChanged?: (cardId: string, subtasks: Subtask[]) => void;
  isNew?: boolean;
  onAdd?: (card: Card) => void;
}) {
  const t = useTranslations("Kanban");
  const tCard = useTranslations("KanbanCardModal");
  const tShared = useTranslations("KanbanShared");
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority] = useState(card.priority);
  const [category, setCategory] = useState(card.category ?? "");
  const [assigneeId, setAssigneeId] = useState(card.assigneeId ?? "");
  const [startDate, setStartDate] = useState(toDateInput(card.startDate));
  const [dueDate, setDueDate] = useState(toDateInput(card.dueDate));
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(card.subtasks ?? []);
  const subtasksMountedRef = useRef(false);
  useEffect(() => {
    if (!subtasksMountedRef.current) { subtasksMountedRef.current = true; return; }
    onSubtasksChanged?.(card.id, localSubtasks);
  }, [localSubtasks, card.id, onSubtasksChanged]);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [subtaskMenuOpen, setSubtaskMenuOpen] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openToPublic, setOpenToPublic] = useState(!!card.openToPublic);
  const [cardAssigneeId, setCardAssigneeId] = useState(card.assigneeId ?? null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimPending, setClaimPending] = useState(false);
  const [, startTransition] = useTransition();

  // Cards mirrored from GitHub are read-only: GitHub owns the title, state and
  // column, so any edit here would be reverted by the next sync. Comments and
  // likes stay available — they are local and never leave the app.
  const isGithub = isGithubCard(card);
  const canEdit = isLoggedIn && !isGithub;
  const canDelete = (currentUserId === card.createdById || isLead) && !isGithub;
  const canDeleteSubtask = (s: Subtask) => !isGithub && (currentUserId === card.createdById || isLead || s.id.startsWith("temp-"));
  const isClaimant = openToPublic && !!currentUserId && cardAssigneeId === currentUserId;
  const canInteractWithCard = isMember || isClaimant;

  const claimErrorKeys: Record<string, string> = {
    "This task is not open for public claiming": "claimErrorNotOpen",
    "This task is already done": "claimErrorDone",
    "Someone already claimed this task": "claimErrorAlreadyClaimed",
    "Members should assign themselves via the card editor": "claimErrorMember",
    "Not your claimed task": "abandonErrorNotYours",
  };
  function translateClaimError(error: string): string {
    const key = claimErrorKeys[error];
    return key ? t(key) : error;
  }

  async function handleClaim() {
    setClaimPending(true);
    setClaimError(null);
    const result = await claimCard(card.id);
    if (result && "error" in result && result.error) {
      setClaimError(translateClaimError(result.error));
    } else if (result && "card" in result && result.card) {
      setCardAssigneeId(result.card.assigneeId ?? null);
      onSaved(card.id, { assigneeId: result.card.assigneeId ?? null, claimedAt: result.card.claimedAt ?? null });
    }
    setClaimPending(false);
  }

  async function handleAbandon() {
    setClaimPending(true);
    setClaimError(null);
    const result = await abandonCard(card.id);
    if (result && "error" in result && result.error) {
      setClaimError(translateClaimError(result.error));
    } else {
      setCardAssigneeId(null);
      onSaved(card.id, { assigneeId: null, claimedAt: null });
    }
    setClaimPending(false);
  }

  async function handleToggleOpenToPublic(next: boolean) {
    setOpenToPublic(next);
    onSaved(card.id, { openToPublic: next });
    const result = await setCardOpenToPublic(card.id, next);
    if (result && "error" in result && result.error) {
      setOpenToPublic(!next);
      onSaved(card.id, { openToPublic: !next });
    }
  }

  const columnLabel = COLUMNS.find((c) => c.key === card.column)?.label ?? card.column;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function save() {
    if (!title.trim()) return;
    if (isNew && !category) return;
    if (isNew) {
      const pendingSubtask = newSubtaskInput.trim();
      const allSubtasks = pendingSubtask
        ? [...localSubtasks, { id: `temp-${Date.now()}`, title: pendingSubtask, done: false, order: localSubtasks.length }]
        : localSubtasks;
      const subtaskTitles = allSubtasks.map((s) => s.title).filter(Boolean);
      // No optimistic append here — the board's SSE subscription (see
      // KanbanBoard.tsx) adds the real, fully-joined card as soon as the
      // server broadcasts it. An optimistic copy under a temp id used to
      // race that broadcast and show up as a second, avatar-less card.
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
      ).catch(() => alert(tCard("createCardError")));
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
    const next = !s.done;
    setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: next, completedById: next ? currentUserId : null } : t));
    if (!s.id.startsWith("temp-")) {
      startTransition(async () => {
        try { await toggleSubtask(s.id, next); }
        catch { setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: s.done, completedById: s.completedById } : t)); }
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
    if (!s.id.startsWith("temp-")) {
      const result = await deleteSubtask(s.id);
      if (result && "error" in result) {
        setLocalSubtasks((prev) => [...prev, s]);
        alert(tCard("deleteSubtaskError"));
      }
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col rounded-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{isNew ? tCard("newCardBadge") : columnLabel}</span>
          <button onClick={onClose} aria-label={tCard("closeAria")} className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pt-3 pb-5 space-y-1">
          {isGithub && (
            <div className="rounded-lg bg-dark-slate/5 px-3 py-2 mb-2 text-xs text-dark-slate/70">
              {tCard("githubMirroredNotice")}
              <GithubCardMeta card={card} />
            </div>
          )}

          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
            rows={1}
            className="w-full text-lg font-semibold text-gray-900 resize-none border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-400 outline-none bg-white placeholder-gray-300 focus:ring-0 leading-tight transition-colors"
            placeholder={tCard("titlePlaceholder")}
          />

          {/* Metadata grid */}
          <div className="grid grid-cols-[7rem_1fr] gap-y-3 gap-x-3 text-sm">
            <span className="text-gray-400 pt-1">{tCard("priorityLabel")}</span>
            {isLead ? (
              <div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={!canEdit}
                  className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-white disabled:opacity-60"
                >
                  {Object.entries(PRIORITY_META).map(([k, v]) => (
                    <option key={k} value={k}>{tCard("priorityOptionTokens", { label: tShared(PRIORITY_LABEL_KEYS[k]), tokens: v.tokenValue })}</option>
                  ))}
                </select>
                {card.priorityLockedAt && !isNew && (
                  <p className="text-xs text-gray-400 mt-1">
                    {tCard("priorityLockedNotice")}
                  </p>
                )}
              </div>
            ) : card.priorityLockedAt && !isNew ? (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 pt-1" title={tCard("priorityLockedTooltip")}>
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{tCard("priorityLockedDisplay", { label: PRIORITY_META[priority] ? tShared(PRIORITY_LABEL_KEYS[priority]) : priority, tokens: card.lockedTokenValue ?? PRIORITY_META[priority]?.tokenValue })}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 pt-1">
                {tCard("priorityDisplay", { label: PRIORITY_META[priority] ? tShared(PRIORITY_LABEL_KEYS[priority]) : priority, tokens: PRIORITY_META[priority]?.tokenValue })}
              </p>
            )}

            <span className="text-gray-400 pt-2">{tCard("categoryLabel")}{isNew && <span className="text-red-400"> {tCard("categoryRequiredMark")}</span>}</span>
            <div>
            <div className="flex flex-wrap gap-1.5">
              {!isNew && (
                <button
                  type="button"
                  onClick={() => canEdit && setCategory("")}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    !category ? "border-gray-400 bg-gray-100 text-gray-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {tCard("categoryNone")}
                </button>
              )}
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => canEdit && setCategory(category === key && !isNew ? "" : key)}
                  style={category === key ? { backgroundColor: meta.hex + "22", borderColor: meta.hex, color: meta.hex } : {}}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    category === key ? "" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {tShared(CATEGORY_LABEL_KEYS[key])}
                </button>
              ))}
            </div>
            {isNew && !category && (
              <p className="text-xs text-red-400 mt-1">{tCard("categoryRequiredHint")}</p>
            )}
            </div>

            <span className="text-gray-400 pt-1">{tCard("assigneeLabel")}</span>
            {isMember || isNew ? (
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canEdit}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-white disabled:opacity-60"
              >
                <option value="">{tCard("assigneeNoneOption")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                ))}
              </select>
            ) : openToPublic && !cardAssigneeId && canEdit ? (
              <div>
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claimPending}
                  className="text-sm font-medium text-white bg-seagrass px-3 py-1.5 rounded-lg hover:bg-seagrass/80 disabled:opacity-50 transition-colors"
                >
                  {claimPending ? t("claimButtonPending") : t("claimButton")}
                </button>
                {claimError && <p className="text-xs text-red-500 mt-1">{claimError}</p>}
              </div>
            ) : isClaimant ? (
              <div>
                <p className="text-sm text-gray-700">{t("claimedByYou")}</p>
                <button
                  type="button"
                  onClick={handleAbandon}
                  disabled={claimPending}
                  className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors mt-1"
                >
                  {claimPending ? t("abandonButtonPending") : t("abandonButton")}
                </button>
                {claimError && <p className="text-xs text-red-500 mt-1">{claimError}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400 pt-1">
                {card.assignee?.name
                  ?? (openToPublic && !cardAssigneeId
                    ? t("claimedLoginPrompt")
                    : openToPublic
                    ? t("openTaskTooltipClaimed")
                    : t("noAssignee"))}
              </p>
            )}

            {isLead && (
              <>
                <span className="text-gray-400 pt-1">{t("openToPublicLabel")}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openToPublic}
                    onChange={(e) => handleToggleOpenToPublic(e.target.checked)}
                    disabled={isNew}
                    className="w-4 h-4 accent-seagrass"
                  />
                  <span className="text-xs text-gray-500">{t("openToPublicHelp")}</span>
                </label>
              </>
            )}

            <span className="text-gray-400 pt-1">{tCard("startDateLabel")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!canEdit}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 disabled:opacity-60"
            />

            <span className="text-gray-400 pt-1">{tCard("dueDateLabel")}</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!canEdit}
              className="border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400 disabled:opacity-60"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{tCard("descriptionLabel")}</p>
            {canEdit ? (
              <RichTextEditor content={description} onChange={setDescription} />
            ) : description ? (
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
              />
            ) : (
              <p className="text-sm text-gray-300 italic">{tCard("descriptionEmpty")}</p>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{tCard("subtasksLabel")}</p>
              <div className="flex items-center gap-3">
                {localSubtasks.length > 0 && canEdit && !isNew && (
                  <button
                    type="button"
                    onClick={() => {
                      const eligible = localSubtasks.filter((s) => !s.id.startsWith("temp-"));
                      eligible.forEach((s) => handlePromoteSubtask(s));
                    }}
                    className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
                    title={tCard("convertAllToCardsTitle")}
                  >
                    {tCard("convertAllToCardsButton")}
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
                        onClick={() => canEdit && handleToggle(s)}
                        aria-label={s.done ? tCard("subtaskMarkNotDoneAria") : tCard("subtaskMarkDoneAria")}
                        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"} ${canEdit ? "cursor-pointer" : "cursor-default"}`}
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
                          className="flex-1 text-sm border-b border-blue-400 outline-none py-0.5 text-gray-700 bg-white"
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

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setSubtaskMenuOpen(subtaskMenuOpen === s.id ? null : s.id)}
                          aria-label={tCard("subtaskMoreOptionsAria")}
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
                              {tCard("subtaskEdit")}
                            </button>
                            {canDeleteSubtask(s) && (
                              <button
                                type="button"
                                onClick={() => { handleDeleteSubtask(s); setSubtaskMenuOpen(null); }}
                                className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-red-50 transition-colors"
                              >
                                {tCard("subtaskDelete")}
                              </button>
                            )}
                            {!isNew && !s.id.startsWith("temp-") && (
                              <button
                                type="button"
                                onClick={() => { handlePromoteSubtask(s); setSubtaskMenuOpen(null); }}
                                className="w-full text-left text-sm px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                {tCard("subtaskConvertToOwnCard")}
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

            {canEdit && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
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

          {/* Comments */}
          {!isNew && (
            <KanbanCardModalComments
              cardId={card.id}
              initialComments={card.comments ?? []}
              initialLiked={!!card.likedByMe}
              initialLikeCount={card.likeCount ?? 0}
              isLoggedIn={isLoggedIn}
              currentUserId={currentUserId}
              canInteractWithCard={canInteractWithCard}
              onSaved={onSaved}
            />
          )}
        </div>

        {/* Footer */}
        {isLoggedIn && (
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={save}
              disabled={!title.trim() || (isNew && !category)}
              title={isNew && !category ? tCard("categoryRequiredTitle") : undefined}
              className="bg-seagrass text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-seagrass/80 disabled:opacity-40 transition-colors"
            >
              {isNew ? tCard("saveButtonCreate") : tCard("saveButtonUpdate")}
            </button>
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {tCard("cancelButton")}
            </button>
            {canDelete && (
              <div className="ml-auto">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{tCard("deleteConfirmPrompt")}</span>
                    <button
                      onClick={() => { onDelete(card.id); onClose(); }}
                      className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {tCard("deleteConfirmYes")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {tCard("cancelButton")}
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
                    {tCard("deleteButton")}
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

export const CardDetailModal = React.memo(CardDetailModalImpl);
