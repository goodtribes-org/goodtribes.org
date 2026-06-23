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

type CardCreator = { name: string | null };

type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  column: string;
  order: number;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: CardCreator | null;
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
  if (diff < 60) return `${diff}s sedan`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min sedan`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} tim sedan`;
  return `${Math.floor(diff / 86400)} d sedan`;
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

function KanbanCardItem({
  card,
  currentUserId,
  onDelete,
}: {
  card: Card;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing group hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{card.title}</p>
        <Avatar name={card.createdBy?.name ?? null} />
      </div>
      {card.description && (
        <p className="text-xs text-gray-500 mt-1 leading-snug">{card.description}</p>
      )}
      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
        <span>av {card.createdBy?.name?.split(" ")[0] ?? "Okänd"}</span>
        <span>·</span>
        <span>{timeAgo(card.createdAt)}</span>
      </div>
      {currentUserId === card.createdById && (
        <button
          className="mt-2 text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
        >
          Ta bort
        </button>
      )}
    </div>
  );
}

function AddCardInline({
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
  const [title, setTitle] = useState("");
  const [, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    onAdd({
      id: `temp-${Date.now()}`,
      projectSlug,
      title: title.trim(),
      description: null,
      column,
      order: 9999,
      createdById: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    });
    const t = title;
    setTitle("");
    onClose();
    startTransition(async () => { await createCard(projectSlug, t, column); });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          if (e.key === "Escape") onClose();
        }}
        placeholder="Kortets titel..."
        rows={2}
        className="w-full text-sm resize-none focus:outline-none text-gray-800 placeholder-gray-400"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
        >
          Lägg till
        </button>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-2">
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
  activeAddCol,
  onSetAddCol,
  onAdd,
  onDelete,
}: {
  col: { key: string; label: string; color: string };
  cards: Card[];
  isLoggedIn: boolean;
  projectSlug: string;
  currentUserId: string | null;
  activeAddCol: string | null;
  onSetAddCol: (col: string | null) => void;
  onAdd: (col: string, card: Card) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div className="flex flex-col flex-1 min-w-52 shrink-0">
      {/* Colored top border */}
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: col.color }} />

      {/* Column header */}
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
              onClick={() => onSetAddCol(activeAddCol === col.key ? null : col.key)}
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

      {/* Cards area */}
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 min-h-32 p-2 border-x border-b border-gray-200 rounded-b-lg flex flex-col gap-2 transition-colors"
          style={{ backgroundColor: isOver ? `${col.color}10` : cards.length === 0 ? "#fafafa" : "white" }}
        >
          {cards.length === 0 && !isOver && activeAddCol !== col.key && (
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
            />
          ))}
          {activeAddCol === col.key && (
            <AddCardInline
              projectSlug={projectSlug}
              column={col.key}
              onAdd={(card) => onAdd(col.key, card)}
              onClose={() => onSetAddCol(null)}
            />
          )}
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
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
}) {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeAddCol, setActiveAddCol] = useState<string | null>(null);
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
    startTransition(async () => { await moveCard(cardId, targetCol); });
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
    startTransition(async () => { await deleteCard(cardId); });
  }

  return (
    <div>
      {isLoggedIn && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveAddCol(activeAddCol ? null : "BACKLOG")}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <span className="text-base leading-none font-bold">+</span> Lägg till kort
          </button>
        </div>
      )}
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
                activeAddCol={activeAddCol}
                onSetAddCol={setActiveAddCol}
                onAdd={handleAdd}
                onDelete={handleDelete}
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
    </div>
  );
}
