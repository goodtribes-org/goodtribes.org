"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  createCard,
  updateCard,
  claimCard,
  abandonCard,
  setCardOpenToPublic,
} from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import GithubCardMeta, { isGithubCard } from "@/components/GithubCardMeta";
import KanbanCardModalComments from "@/components/KanbanCardModalComments";
import KanbanCardModalSubtasks from "@/components/KanbanCardModalSubtasks";
import KanbanCardModalFooter from "@/components/KanbanCardModalFooter";
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
  // Lifted out of KanbanCardModalSubtasks (which otherwise owns all
  // subtask-widget-local state) specifically because save()'s isNew path
  // below needs to fold in whatever's typed but not yet added.
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const subtasksMountedRef = useRef(false);
  useEffect(() => {
    if (!subtasksMountedRef.current) { subtasksMountedRef.current = true; return; }
    onSubtasksChanged?.(card.id, localSubtasks);
  }, [localSubtasks, card.id, onSubtasksChanged]);
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
          <KanbanCardModalSubtasks
            subtasks={localSubtasks}
            onChange={setLocalSubtasks}
            newSubtaskInput={newSubtaskInput}
            onNewSubtaskInputChange={setNewSubtaskInput}
            canEdit={canEdit}
            isNew={isNew}
            cardId={card.id}
            currentUserId={currentUserId}
            canDeleteSubtask={canDeleteSubtask}
            onSubtaskAdded={onSubtaskAdded}
            onAdd={onAdd}
          />

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
        <KanbanCardModalFooter
          isLoggedIn={isLoggedIn}
          canDelete={canDelete}
          canSave={!!title.trim() && !(isNew && !category)}
          saveDisabledTitle={isNew && !category ? tCard("categoryRequiredTitle") : undefined}
          isNew={isNew}
          onSave={save}
          onClose={onClose}
          onConfirmDelete={() => { onDelete(card.id); onClose(); }}
        />
      </div>
    </div>
  );
}

export const CardDetailModal = React.memo(CardDetailModalImpl);
