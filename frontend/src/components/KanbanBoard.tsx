"use client";

import { useState, useTransition, useEffect, useMemo, useCallback, type ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { deleteCard } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import {
  ChunkErrorBoundary,
  CATEGORY_META,
  PRIORITY_META,
  COLUMNS,
  COLUMN_ORDER,
  type Card,
  type Columns,
  type Member,
  type Subtask,
} from "./kanbanShared";
import { CardDetailModal } from "./KanbanCardModal";
import { KanbanColumn } from "./KanbanColumn";

export type { Member };

export default function KanbanBoard({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
  isMember,
  isLead,
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
  isLead: boolean;
  members: Member[];
  requestAddColumn?: string | null;
  onRequestAddDone?: () => void;
  requestOpenCardId?: string | null;
  viewToggle?: ReactNode;
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

  // Live sync: other users' card create/update/move/delete/clear-column
  // actions get pushed here over SSE so the board updates without a reload.
  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectSlug}/kanban/sse`);

    es.addEventListener("kanban-change", (e) => {
      const payload = JSON.parse((e as MessageEvent).data) as {
        action: "created" | "updated" | "moved" | "deleted" | "column-cleared";
        card?: Card;
        cardId?: string;
        column?: string;
      };

      setColumns((prev) => {
        if (payload.action === "deleted" && payload.cardId) {
          const updated = { ...prev };
          for (const key of COLUMN_ORDER) {
            const col = key as keyof Columns;
            updated[col] = (updated[col] as Card[]).filter((c) => c.id !== payload.cardId) as typeof updated[typeof col];
          }
          return updated;
        }

        if (payload.action === "column-cleared" && payload.column) {
          const col = payload.column as keyof Columns;
          return { ...prev, [col]: [] };
        }

        if (!payload.card) return prev;
        const incoming = payload.card;
        const existing = Object.values(prev).flat().find((c) => c.id === incoming.id);
        // The published row is a bare Prisma record (no relations) — merge
        // onto any already-loaded card so avatar/subtasks/comments etc.
        // already visible to this client aren't wiped out by the echo.
        const merged = existing ? { ...existing, ...incoming } : incoming;

        const updated = { ...prev };
        for (const key of COLUMN_ORDER) {
          const col = key as keyof Columns;
          updated[col] = (updated[col] as Card[]).filter((c) => c.id !== incoming.id) as typeof updated[typeof col];
        }
        const targetCol = merged.column as keyof Columns;
        updated[targetCol] = [...(updated[targetCol] as Card[]), merged] as typeof updated[typeof targetCol];
        return updated;
      });
    });

    es.addEventListener("close", () => es.close());

    return () => es.close();
  }, [projectSlug]);

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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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

    let previousColumns: Columns | undefined;
    setColumns((prev) => {
      previousColumns = prev;
      const card = (prev[sourceCol as keyof Columns] as Card[]).find((c) => c.id === cardId)!;
      return {
        ...prev,
        [sourceCol]: (prev[sourceCol as keyof Columns] as Card[]).filter((c) => c.id !== cardId),
        [targetCol]: [...(prev[targetCol as keyof Columns] as Card[]), { ...card, column: targetCol }],
      };
    });

    (async () => {
      try {
        const res = await fetch("/api/kanban/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, newColumn: targetCol }),
          keepalive: true,
        });
        if (!res.ok) throw new Error("move failed");
      } catch {
        if (previousColumns) setColumns(previousColumns);
      }
    })();
  }

  const handleAdd = useCallback((card: Card) => {
    setColumns((prev) => ({
      ...prev,
      [card.column]: [...(prev[card.column as keyof Columns] as Card[]), card],
    }));
  }, []);

  const handleDelete = useCallback((cardId: string) => {
    setColumns((prev) => {
      for (const key of COLUMN_ORDER) {
        const col = key as keyof Columns;
        if ((prev[col] as Card[]).some((c) => c.id === cardId)) {
          return { ...prev, [col]: (prev[col] as Card[]).filter((c) => c.id !== cardId) };
        }
      }
      return prev;
    });
    startTransition(async () => { try { await deleteCard(cardId); } catch { /* ignore */ } });
  }, [startTransition]);

  const handleClearColumn = useCallback((colKey: string) => {
    setColumns((prev) => ({ ...prev, [colKey]: [] }));
  }, []);

  const handleCardSaved = useCallback((cardId: string, patch: Partial<Card>) => {
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
  }, []);

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
              <KanbanColumn
                key={col.key}
                col={col}
                cards={filteredColumns[col.key as keyof Columns] as Card[]}
                isLoggedIn={isLoggedIn}
                isMember={isMember}
                isLead={isLead}
                projectSlug={projectSlug}
                currentUserId={currentUserId}
                onOpenModal={openNewCard}
                onDelete={handleDelete}
                onOpenCard={setEditingCard}
                onAddCard={handleAdd}
                onClearColumn={handleClearColumn}
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
            isLead={isLead}
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
