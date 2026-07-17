"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { clearColumnCards } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { type Card, type Subtask } from "./kanbanShared";
import { KanbanCardItem } from "./KanbanCardItem";

function KanbanColumnImpl({
  col,
  cards,
  isLoggedIn,
  isMember,
  isLead,
  projectSlug,
  currentUserId,
  onOpenModal,
  onDelete,
  onOpenCard,
  onAddCard,
  onClearColumn,
  runningAI,
  onRunAI,
  onSubtasksChanged,
  onSaved,
}: {
  col: { key: string; label: string; color: string };
  cards: Card[];
  isLoggedIn: boolean;
  isMember: boolean;
  isLead: boolean;
  projectSlug: string;
  currentUserId: string | null;
  onOpenModal: (colKey: string) => void;
  onDelete: (id: string) => void;
  onOpenCard: (card: Card) => void;
  onAddCard: (card: Card) => void;
  onClearColumn: (colKey: string) => void;
  runningAI: Set<string>;
  onRunAI: (cardId: string, agentType: string, additionalContext: string) => void;
  onSubtasksChanged: (cardId: string, subtasks: Subtask[]) => void;
  onSaved: (cardId: string, patch: Partial<Card>) => void;
})
 {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const [menuOpen, setMenuOpen] = useState(false);
  const openSubtaskCount = cards.reduce(
    (sum, c) => sum + (c.subtasks?.filter((s) => !s.done).length ?? 0),
    0
  );

  function handleClearColumn() {
    setMenuOpen(false);
    if (cards.length === 0) return;
    if (!window.confirm(`Ta bort alla ${cards.length} kort i "${col.label}"? Detta går inte att ångra.`)) return;
    onClearColumn(col.key);
    clearColumnCards(projectSlug, col.key).then((result) => {
      if (result && "error" in result) alert("Kunde inte rensa kolumnen. Du måste vara admin eller founder i projektet.");
    });
  }

  return (
    <div className="flex flex-col flex-1 min-w-52 shrink-0">
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: col.color }} />
      <div
        className="flex items-center justify-between px-3 py-2 border-x border-gray-200"
        style={{ backgroundColor: `${col.color}12`, borderTop: `1px solid ${col.color}22` }}
      >
        <span className="text-sm font-semibold text-gray-700">
          {col.label}{" "}
          <span className="font-normal text-gray-400" title="Antal kort">({cards.length})</span>{" "}
          <span className="font-normal text-gray-400" title="Ej avklarade deluppgifter">({openSubtaskCount})</span>
        </span>
        <div className="flex items-center gap-1 relative">
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
          {isLoggedIn && isLead && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Kolumnalternativ"
              title="Kolumnalternativ"
              className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors tracking-widest text-xs pb-1"
            >
              ···
            </button>
          )}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  type="button"
                  onClick={handleClearColumn}
                  className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Rensa kolumn
                </button>
              </div>
            </>
          )}
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
              isLead={isLead}
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

export const KanbanColumn = React.memo(KanbanColumnImpl);
