"use client";

import { useState, useTransition } from "react";
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
import { createCard, moveCard, deleteCard } from "@/app/projects/[slug]/kanban/actions";

type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  column: string;
  order: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

const COLUMN_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "ToDo",
  DOING: "Doing",
  REVIEW: "Review",
  DONE: "Done",
};

const COLUMN_ORDER = ["BACKLOG", "TODO", "DOING", "REVIEW", "DONE"];

function SortableCard({
  card,
  currentUserId,
  onDelete,
}: {
  card: Card;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-muted-teal/30 rounded p-3 shadow-sm cursor-grab active:cursor-grabbing group"
    >
      <p className="text-sm text-dark-slate leading-snug">{card.title}</p>
      {card.description && (
        <p className="text-xs text-dark-slate/50 mt-1 leading-snug">{card.description}</p>
      )}
      {currentUserId === card.createdById && (
        <button
          className="text-xs text-dark-slate/30 hover:text-watermelon mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
        >
          Ta bort
        </button>
      )}
    </div>
  );
}

function AddCardForm({
  projectSlug,
  column,
  onAdd,
}: {
  projectSlug: string;
  column: string;
  onAdd: (card: Card) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    const optimistic: Card = {
      id: `temp-${Date.now()}`,
      projectSlug,
      title: title.trim(),
      description: null,
      column,
      order: 9999,
      createdById: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    onAdd(optimistic);
    const t = title;
    setTitle("");
    setOpen(false);
    startTransition(() => createCard(projectSlug, t, column));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-xs text-dark-slate/40 hover:text-dark-slate py-1 px-2 rounded hover:bg-muted-teal/10 transition-colors"
      >
        + Lägg till kort
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Kortets titel..."
        rows={2}
        className="w-full text-sm border border-muted-teal/40 rounded p-2 resize-none focus:outline-none focus:border-coral"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={isPending || !title.trim()}
          className="text-xs bg-coral text-white px-3 py-1 rounded hover:bg-coral/90 disabled:opacity-50 transition-colors"
        >
          Lägg till
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-dark-slate/50 hover:text-dark-slate px-2 py-1"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

function DroppableColumn({
  col,
  cards,
  isLoggedIn,
  projectSlug,
  currentUserId,
  onAdd,
  onDelete,
}: {
  col: string;
  cards: Card[];
  isLoggedIn: boolean;
  projectSlug: string;
  currentUserId: string | null;
  onAdd: (col: string, card: Card) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col });

  return (
    <div className={`flex flex-col w-64 rounded-lg p-3 shrink-0 transition-colors ${isOver ? "bg-coral/10" : "bg-dry-sage/20"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark-slate">{COLUMN_LABELS[col]}</h3>
        <span className="text-xs text-dark-slate/40 bg-white rounded-full px-2 py-0.5">{cards.length}</span>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-2 flex-1 min-h-[120px]">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              currentUserId={currentUserId}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
      {isLoggedIn && (
        <div className="mt-3 pt-2 border-t border-muted-teal/20">
          <AddCardForm
            projectSlug={projectSlug}
            column={col}
            onAdd={(card) => onAdd(col, card)}
          />
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
}) {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [, startTransition] = useTransition();

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
    const id = event.active.id as string;
    const col = findCardColumn(id);
    if (!col) return;
    const card = (columns[col as keyof Columns] as Card[]).find((c) => c.id === id);
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

    startTransition(() => moveCard(cardId, targetCol));
  }

  function handleAdd(col: string, card: Card) {
    setColumns((prev) => ({
      ...prev,
      [col]: [...(prev[col as keyof Columns] as Card[]), card],
    }));
  }

  function handleDelete(cardId: string) {
    const col = findCardColumn(cardId);
    if (!col) return;
    setColumns((prev) => ({
      ...prev,
      [col]: (prev[col as keyof Columns] as Card[]).filter((c) => c.id !== cardId),
    }));
    startTransition(() => deleteCard(cardId));
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUMN_ORDER.map((col) => (
            <DroppableColumn
              key={col}
              col={col}
              cards={columns[col as keyof Columns] as Card[]}
              isLoggedIn={isLoggedIn}
              projectSlug={projectSlug}
              currentUserId={currentUserId}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeCard && (
          <div className="bg-white border border-coral rounded p-3 shadow-lg rotate-2 w-64">
            <p className="text-sm text-dark-slate">{activeCard.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
