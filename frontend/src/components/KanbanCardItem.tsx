"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addSubtask,
  deleteSubtask,
  updateSubtaskTitle,
  promoteSubtaskToCard,
  toggleSubtask,
} from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { htmlToPreviewText } from "@/lib/renderBody";
import Tooltip from "@/components/Tooltip";
import {
  Avatar,
  CATEGORY_META,
  PRIORITY_META,
  PRIORITY_LABEL_KEYS,
  formatDate,
  type Card,
  type Subtask,
} from "./kanbanShared";
import { CATEGORY_LABEL_KEYS } from "@/lib/kanbanCategories";
import { KanbanCardComments } from "./KanbanCardComments";
import GithubCardMeta, { isGithubCard } from "@/components/GithubCardMeta";

function KanbanCardItemImpl({
  card,
  currentUserId,
  isLoggedIn,
  isMember,
  isLead,
  onDelete: _onDelete,
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
  isLead: boolean;
  onDelete: (id: string) => void;
  onOpenCard: (card: Card) => void;
  onAddCard?: (card: Card) => void;
  runningAI: Set<string>;
  onRunAI: (cardId: string, agentType: string, additionalContext: string) => void;
  onSubtasksChanged?: (cardId: string, subtasks: Subtask[]) => void;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
}) {
  const t = useTranslations("KanbanCardItem");
  const tKanban = useTranslations("Kanban");
  const tShared = useTranslations("KanbanShared");
  const AGENT_OPTIONS = [
    { value: "writer",     label: t("agentOptionWriter") },
    { value: "analyst",    label: t("agentOptionAnalyst") },
    { value: "researcher", label: t("agentOptionResearcher") },
  ];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const isClaimant = !!card.openToPublic && !!currentUserId && card.assigneeId === currentUserId;
  // GitHub owns a mirrored card's column and subtasks — no drag, no toggling.
  const isGithub = isGithubCard(card);
  const canInteract = isLoggedIn && (isMember || isClaimant) && !isGithub;
  const canDeleteSubtask = (s: Subtask) => !isGithub && (currentUserId === card.createdById || isLead || s.id.startsWith("temp-"));

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

  const due = formatDate(card.dueDate);
  const priorityKey = PRIORITY_META[card.priority] ? card.priority : "normal";
  const priorityMeta = PRIORITY_META[priorityKey];
  const priorityLabel = tShared(PRIORITY_LABEL_KEYS[priorityKey]);

  const descPreview = (() => {
    if (!card.description) return "";
    const text = htmlToPreviewText(card.description);
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  })();

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
    if (!s.id.startsWith("temp-")) {
      const result = await deleteSubtask(s.id);
      if (result && "error" in result) {
        setLocalSubtasks((prev) => [...prev, s]);
        alert(t("deleteSubtaskError"));
      }
    }
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
    <div className="relative">
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, borderBottomColor: priorityMeta.bottomHex }}
      {...(canInteract ? attributes : {})}
      {...(canInteract ? listeners : {})}
      suppressHydrationWarning
      className="bg-white border border-b-2 border-gray-200 rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.25)] group hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)] hover:border-gray-300 transition-all overflow-hidden"
    >
      {categoryHex && (
        <div className="h-1" style={{ backgroundColor: categoryHex }} title={tShared(CATEGORY_LABEL_KEYS[card.category!])} />
      )}
      <div className="px-2 py-1.5">
        <Tooltip lines={descPreview ? [descPreview] : []} className="flex gap-1.5 items-start">
          {/* Vänster: titel + metadata */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 leading-snug truncate">{card.title}</p>
            <GithubCardMeta card={card} compact />
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <Tooltip lines={[t("priorityTooltip", { label: priorityLabel, value: card.lockedTokenValue ?? priorityMeta.tokenValue, locked: card.priorityLockedAt ? "true" : "false" })]}>
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <span className={`inline-block w-2 h-2 rounded-full ${priorityMeta.dot} shrink-0`} />
                  {card.priorityLockedAt && (
                    <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </span>
              </Tooltip>
              {card.openToPublic && (
                <Tooltip lines={[card.assigneeId ? tKanban("openTaskTooltipClaimed") : tKanban("openTaskTooltipUnclaimed")]}>
                  <span className={`text-[9px] font-medium px-1 py-px rounded shrink-0 whitespace-nowrap ${card.assigneeId ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"}`}>
                    {card.assigneeId ? tKanban("openTaskBadgeClaimed") : tKanban("openTaskBadge")}
                  </span>
                </Tooltip>
              )}
              {(card.startDate || card.dueDate) ? (
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  {t("dateRangeLabel", { range: [formatDate(card.startDate ?? null), due].filter(Boolean).join(" – ") })}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  {t("createdLabel", { date: formatDate(card.createdAt) ?? "" })}
                </span>
              )}
              {localSubtasks.length > 0 && (
                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                  {t("subtasksDoneCount", { done: localSubtasks.filter((s) => s.done).length, total: localSubtasks.length })}
                </span>
              )}
            </div>
          </div>

          {/* Höger: avatar ovanför + knapp och pil, alla staplade */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <Avatar
              name={card.assignee?.name ?? card.createdBy?.name ?? null}
              image={card.assignee?.image ?? card.createdBy?.image ?? null}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenCard(card); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              title={t("editCardButton")}
              aria-label={t("editCardButton")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 4v16M4 12h16" />
              </svg>
            </button>
          </div>
        </Tooltip>

        <div className="flex items-start justify-between gap-1">
          <KanbanCardComments card={card} isLoggedIn={isLoggedIn} isMember={isMember} isClaimant={isClaimant} onSaved={onSaved} />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDetailsExpanded((v) => !v); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors shrink-0 mt-1"
            title={t("toggleDetailsButton")}
            aria-label={t("toggleDetailsButton")}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${detailsExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expanderat block */}
        <div>

          {detailsExpanded && (
            <div
              className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {localSubtasks.length > 0 && (
                <>
                  <span className={`text-xs font-medium ${localSubtasks.every((s) => s.done) ? "text-green-600" : "text-gray-400"}`}>
                    {t("subtasksDoneCountExpanded", { done: localSubtasks.filter((s) => s.done).length, total: localSubtasks.length })}
                  </span>
                  {localSubtasks.map((s) => (
                    <div key={s.id} className="relative flex items-center gap-1.5 group/sub py-0.5">
                      <button
                        type="button"
                        disabled={!canInteract}
                        onClick={() => {
                          if (!canInteract) return;
                          const next = !s.done;
                          setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: next, completedById: next ? currentUserId : null } : t));
                          if (!s.id.startsWith("temp-")) startTransition(async () => {
                            try { await toggleSubtask(s.id, next); }
                            catch { setLocalSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, done: s.done, completedById: s.completedById } : t)); }
                          });
                        }}
                        aria-label={s.done ? t("markSubtaskIncomplete") : t("markSubtaskComplete")}
                        className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${s.done ? "bg-green-500 border-green-500" : "border-gray-300 group-hover/sub:border-blue-400"} ${!canInteract ? "cursor-default opacity-60" : ""}`}
                      >
                        {s.done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>

                      {editingSubtaskId === s.id ? (
                        <input
                          autoFocus
                          className="flex-1 text-xs border-b border-blue-400 outline-none bg-transparent text-gray-700 py-0"
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") handleCardSaveSubtaskEdit(s); if (e.key === "Escape") setEditingSubtaskId(null); }}
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
                          aria-label={t("subtaskMoreOptions")}
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
                  <span className="text-base leading-none font-light">+</span> {t("addSubtaskButton")}
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
                      e.stopPropagation();
                      if (e.key === "Enter") { handleQuickAddSubtask(); }
                      if (e.key === "Escape") { setAddingSubtask(false); setNewSubtaskInput(""); }
                    }}
                    onBlur={() => { if (!newSubtaskInput.trim()) setAddingSubtask(false); else handleQuickAddSubtask().then(() => setAddingSubtask(false)); }}
                    placeholder={t("newSubtaskPlaceholder")}
                    className="flex-1 text-xs border-b border-blue-400 outline-none py-0.5 placeholder-gray-300 bg-transparent text-gray-700"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleQuickAddSubtask}
                    disabled={!newSubtaskInput.trim()}
                    aria-label={t("addSubtaskConfirm")}
                    className="shrink-0 flex items-center justify-center w-4 h-4 rounded bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 text-white text-xs leading-none font-bold transition-colors"
                  >
                    ✓
                  </button>
                </div>
              )}

              {isLoggedIn && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                  {isAiRunning ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      {t("aiWorking")}
                    </div>
                  ) : aiStatus === "awaiting_review" ? (
                    <a
                      href={`/projects/${card.projectSlug}/ai-review`}
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                      {t("aiDraftReady")}
                    </a>
                  ) : aiPanelOpen ? (
                    <div className="space-y-1.5">
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700"
                      >
                        {AGENT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <textarea
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        placeholder={t("aiContextPlaceholder")}
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 placeholder-gray-300 bg-transparent text-gray-700 resize-none"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => { onRunAI(card.id, selectedAgent, additionalContext); setAiPanelOpen(false); }}
                          className="text-xs font-medium px-2 py-1 rounded bg-coral text-white hover:bg-watermelon transition-colors"
                        >
                          {t("runAiAgent")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiPanelOpen(false)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          {t("cancelButton")}
                        </button>
                      </div>
                    </div>
                  ) : isGithub ? null : (
                    <button
                      type="button"
                      onClick={() => setAiPanelOpen(true)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      {t("assignAiButton")}
                    </button>
                  )}
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
            <button type="button" onClick={() => { setEditingSubtaskId(s.id); setEditingSubtaskTitle(s.title); setSubtaskMenuPos(null); }} className="w-full text-left text-xs px-3 py-1.5 text-gray-700 hover:bg-gray-50">{t("subtaskEditMenuItem")}</button>
            {canDeleteSubtask(s) && (
              <button type="button" onClick={() => { handleCardDeleteSubtask(s); setSubtaskMenuPos(null); }} className="w-full text-left text-xs px-3 py-1.5 text-red-500 hover:bg-red-50">{t("subtaskDeleteMenuItem")}</button>
            )}
            <button
              type="button"
              disabled={s.id.startsWith("temp-")}
              title={s.id.startsWith("temp-") ? t("subtaskSavingTooltip") : undefined}
              onClick={() => { handleCardPromoteSubtask(s); setSubtaskMenuPos(null); }}
              className="w-full text-left text-xs px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              {t("promoteToCardButton")}
            </button>
          </div>
        </>,
        document.body
      );
    })()}
    </div>
  );
}

export const KanbanCardItem = React.memo(KanbanCardItemImpl);
