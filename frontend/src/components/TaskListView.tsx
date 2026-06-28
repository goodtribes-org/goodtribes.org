"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import type { Member } from "@/components/KanbanBoard";
import {
  createCard,
  moveCard,
  deleteCard,
} from "@/app/projects/[slug]/kanban/actions";

type Card = {
  id: string;
  projectSlug: string;
  title: string;
  description: string | null;
  dueDate: Date | string | null;
  column: string;
  order: number;
  priority: string;
  assigneeId: string | null;
  assignee: Member | null;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { name: string | null } | null;
};

type Columns = {
  BACKLOG: Card[];
  TODO: Card[];
  DOING: Card[];
  REVIEW: Card[];
  DONE: Card[];
};

const COLUMN_DEFS = [
  { key: "BACKLOG", label: "Backlog",     color: "#8b5cf6" },
  { key: "TODO",    label: "Att göra",    color: "#f59e0b" },
  { key: "DOING",   label: "Pågår",       color: "#3b82f6" },
  { key: "REVIEW",  label: "Granskning",  color: "#6b7280" },
  { key: "DONE",    label: "Klart",       color: "#10b981" },
];

const PRIORITY_DOT: Record<string, string> = {
  low:    "bg-gray-300",
  normal: "bg-blue-400",
  high:   "bg-orange-400",
  urgent: "bg-red-500",
};

function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function TaskListView({
  projectSlug,
  initialColumns,
  isLoggedIn,
  currentUserId,
  members,
}: {
  projectSlug: string;
  initialColumns: Columns;
  isLoggedIn: boolean;
  currentUserId: string | null;
  members: Member[];
}) {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ DONE: true });
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);

  function handleCardDone(cardId: string) {
    setColumns((prev) => {
      const srcKey = (Object.keys(prev) as (keyof Columns)[]).find((k) =>
        prev[k].some((c) => c.id === cardId)
      );
      if (!srcKey || srcKey === "DONE") return prev;
      const card = prev[srcKey].find((c) => c.id === cardId)!;
      return {
        ...prev,
        [srcKey]: prev[srcKey].filter((c) => c.id !== cardId),
        DONE: [...prev.DONE, { ...card, column: "DONE" }],
      };
    });
  }

  function handleCardUndone(cardId: string) {
    setColumns((prev) => {
      const card = prev.DONE.find((c) => c.id === cardId);
      if (!card) return prev;
      return {
        ...prev,
        DONE: prev.DONE.filter((c) => c.id !== cardId),
        TODO: [...prev.TODO, { ...card, column: "TODO" }],
      };
    });
  }

  function handleCardDeleted(cardId: string) {
    setColumns((prev) => {
      const srcKey = (Object.keys(prev) as (keyof Columns)[]).find((k) =>
        prev[k].some((c) => c.id === cardId)
      );
      if (!srcKey) return prev;
      return { ...prev, [srcKey]: prev[srcKey].filter((c) => c.id !== cardId) };
    });
  }

  function handleCardAdded(card: Card) {
    const col = card.column as keyof Columns;
    setColumns((prev) => ({ ...prev, [col]: [...prev[col], card] }));
    setAddingInColumn(null);
  }

  return (
    <div className="max-w-2xl">
      {COLUMN_DEFS.map((col) => (
        <SectionGroup
          key={col.key}
          col={col}
          cards={columns[col.key as keyof Columns]}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isCollapsed={!!collapsed[col.key]}
          onToggleCollapse={() =>
            setCollapsed((p) => ({ ...p, [col.key]: !p[col.key] }))
          }
          isAddingHere={addingInColumn === col.key}
          onOpenAdd={() => setAddingInColumn(col.key)}
          onCloseAdd={() => setAddingInColumn(null)}
          onCardAdded={handleCardAdded}
          onCardDone={handleCardDone}
          onCardUndone={handleCardUndone}
          onCardDeleted={handleCardDeleted}
          projectSlug={projectSlug}
        />
      ))}
    </div>
  );
}

function SectionGroup({
  col,
  cards,
  isLoggedIn,
  currentUserId,
  isCollapsed,
  onToggleCollapse,
  isAddingHere,
  onOpenAdd,
  onCloseAdd,
  onCardAdded,
  onCardDone,
  onCardUndone,
  onCardDeleted,
  projectSlug,
}: {
  col: { key: string; label: string; color: string };
  cards: Card[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isAddingHere: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  onCardAdded: (card: Card) => void;
  onCardDone: (id: string) => void;
  onCardUndone: (id: string) => void;
  onCardDeleted: (id: string) => void;
  projectSlug: string;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="mb-6">
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 w-full py-2 group text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: col.color }}
        />
        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
        <span className="text-xs text-gray-400 font-normal">({cards.length})</span>
        <svg
          className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="h-px bg-gray-100 mb-1" />

      {!isCollapsed && (
        <>
          {cards.map((card) => (
            <TaskRow
              key={card.id}
              card={card}
              isLoggedIn={isLoggedIn}
              currentUserId={currentUserId}
              onCheck={() => {
                if (card.column === "DONE") {
                  onCardUndone(card.id);
                  startTransition(async () => { await moveCard(card.id, "TODO"); });
                } else {
                  onCardDone(card.id);
                  startTransition(async () => { await moveCard(card.id, "DONE"); });
                }
              }}
              onDelete={() => {
                onCardDeleted(card.id);
                startTransition(async () => { await deleteCard(card.id); });
              }}
            />
          ))}

          {isLoggedIn && (
            isAddingHere ? (
              <InlineAddRow
                projectSlug={projectSlug}
                column={col.key}
                onAdd={onCardAdded}
                onClose={onCloseAdd}
              />
            ) : (
              <button
                onClick={onOpenAdd}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-seagrass py-1.5 mt-1 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Lägg till uppgift
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({
  card,
  isLoggedIn,
  currentUserId,
  onCheck,
  onDelete,
}: {
  card: Card;
  isLoggedIn: boolean;
  currentUserId: string | null;
  onCheck: () => void;
  onDelete: () => void;
}) {
  const isDone = card.column === "DONE";
  const due = formatDate(card.dueDate);
  const priorityDot = PRIORITY_DOT[card.priority] ?? "bg-gray-300";

  return (
    <div className="flex items-center gap-3 py-2 group hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors">
      <button
        onClick={isLoggedIn ? onCheck : undefined}
        className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
          isDone
            ? "bg-seagrass border-seagrass"
            : isLoggedIn
              ? "border-gray-300 hover:border-seagrass"
              : "border-gray-200 cursor-default"
        }`}
        aria-label={isDone ? "Markera som ej klar" : "Markera som klar"}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot}`} />

      <span className={`text-sm flex-1 truncate ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
        {card.title}
      </span>

      {due && !isDone && (
        <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {due}
        </span>
      )}

      {card.assignee && (
        <div className="w-6 h-6 rounded-full bg-seagrass flex items-center justify-center text-white text-xs font-bold shrink-0">
          {(card.assignee.name ?? "?").charAt(0).toUpperCase()}
        </div>
      )}

      {isLoggedIn && currentUserId === card.createdById && (
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-lg leading-none"
          aria-label="Ta bort uppgift"
        >
          ×
        </button>
      )}
    </div>
  );
}

function InlineAddRow({
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function submit() {
    if (!title.trim()) return;
    const optimistic: Card = {
      id: `temp-${Date.now()}`,
      projectSlug,
      title: title.trim(),
      description: null,
      dueDate: null,
      column,
      order: 9999,
      priority: "normal",
      assigneeId: null,
      assignee: null,
      createdById: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
    };
    const t = title.trim();
    onAdd(optimistic);
    startTransition(async () => { await createCard(projectSlug, t, column); });
    setTitle("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-3 py-2 border border-blue-200 rounded-lg px-3 bg-blue-50/30 mt-1">
      <div className="w-5 h-5 shrink-0 rounded border-2 border-gray-200" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Uppgiftsnamn..."
        className="flex-1 text-sm bg-transparent border-0 outline-none placeholder-gray-400 text-gray-800"
      />
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="text-xs font-medium bg-seagrass text-white px-3 py-1 rounded-md hover:bg-seagrass/80 disabled:opacity-40 transition-colors"
        >
          Lägg till
        </button>
        <button
          onClick={onClose}
          className="text-xs font-medium text-gray-500 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
