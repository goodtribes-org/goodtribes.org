"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createList, deleteList, createItem, toggleItem, deleteItem } from "@/app/projects/[slug]/todos/actions";

type TodoItem = {
  id: string;
  listId: string;
  projectSlug: string;
  title: string;
  done: boolean;
  dueDate: Date | string | null;
  order: number;
  createdById: string;
  createdAt: Date | string;
  createdBy: { name: string | null } | null;
};

type TodoList = {
  id: string;
  projectSlug: string;
  name: string;
  order: number;
  createdById: string;
  createdBy: { name: string | null } | null;
  items: TodoItem[];
};

function formatDue(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function ListIcon({ pct }: { pct: number }) {
  const r = 9;
  const cx = 12, cy = 12;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0 mt-0.5">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function NewListModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Create a new list</h2>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">List name</label>
          <input
            ref={ref}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onSave(name); onClose(); } }}
            placeholder="e.g. Newsletter updates"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { if (name.trim()) { onSave(name); onClose(); } }}
            disabled={!name.trim()}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Create list
          </button>
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-500 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Never mind
          </button>
        </div>
      </div>
    </div>
  );
}

function InlineAddItem({
  listId,
  projectSlug,
  onAdd,
  onClose,
}: {
  listId: string;
  projectSlug: string;
  onAdd: (item: TodoItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDue, setShowDue] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  function submit() {
    if (!title.trim()) return;
    const optimistic: TodoItem = {
      id: `temp-${Date.now()}`,
      listId,
      projectSlug,
      title: title.trim(),
      done: false,
      dueDate: dueDate || null,
      order: 9999,
      createdById: "",
      createdAt: new Date(),
      createdBy: null,
    };
    onAdd(optimistic);
    const [t, d] = [title, dueDate];
    startTransition(async () => { await createItem(listId, projectSlug, t, d || undefined); });
    setTitle("");
    setDueDate("");
    setShowDue(false);
    ref.current?.focus();
  }

  return (
    <div className="mt-2 border border-blue-200 rounded-lg bg-blue-50/30 p-3">
      <input
        ref={ref}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Type a to-do and press Enter..."
        className="w-full text-sm bg-transparent border-0 outline-none placeholder-gray-400 text-gray-800"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => setShowDue((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Due date
        </button>
        {showDue && (
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400"
          />
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
          <button
            onClick={onClose}
            className="text-xs font-medium text-gray-500 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoListCard({
  list,
  isLoggedIn,
  currentUserId,
  onDeleteList,
  onAddItem,
  onToggleItem,
  onDeleteItem,
}: {
  list: TodoList;
  isLoggedIn: boolean;
  currentUserId: string | null;
  onDeleteList: (id: string) => void;
  onAddItem: (listId: string, item: TodoItem) => void;
  onToggleItem: (listId: string, itemId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const open = list.items.filter((i) => !i.done);
  const done = list.items.filter((i) => i.done);
  const pct = list.items.length > 0 ? Math.round((done.length / list.items.length) * 100) : 0;

  return (
    <div className="mb-8">
      {/* List header */}
      <div className="flex items-start gap-2 mb-3 group">
        <ListIcon pct={pct} />
        <h2 className="text-lg font-bold text-gray-900 leading-tight flex-1">{list.name}</h2>
        {isLoggedIn && currentUserId === list.createdById && (
          <button
            onClick={() => onDeleteList(list.id)}
            className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
          >
            Delete list
          </button>
        )}
      </div>

      {/* Open items */}
      <div className="space-y-0.5 pl-7">
        {open.map((item) => (
          <TodoItemRow
            key={item.id}
            item={item}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
            onToggle={() => onToggleItem(list.id, item.id)}
            onDelete={() => onDeleteItem(list.id, item.id)}
          />
        ))}

        {/* Completed toggle */}
        {done.length > 0 && (
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showCompleted ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {done.length} completed
          </button>
        )}

        {showCompleted && done.map((item) => (
          <TodoItemRow
            key={item.id}
            item={item}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
            onToggle={() => onToggleItem(list.id, item.id)}
            onDelete={() => onDeleteItem(list.id, item.id)}
          />
        ))}

        {/* Add item */}
        {isLoggedIn && (
          addingItem ? (
            <InlineAddItem
              listId={list.id}
              projectSlug={list.projectSlug}
              onAdd={(item) => { onAddItem(list.id, item); }}
              onClose={() => setAddingItem(false)}
            />
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              className="text-sm text-blue-500 hover:text-blue-700 hover:underline py-1 transition-colors"
            >
              + Add a to-do
            </button>
          )
        )}
      </div>
    </div>
  );
}

function TodoItemRow({
  item,
  isLoggedIn,
  currentUserId,
  onToggle,
  onDelete,
}: {
  item: TodoItem;
  isLoggedIn: boolean;
  currentUserId: string | null;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const due = formatDue(item.dueDate);

  return (
    <div className="flex items-center gap-2.5 py-1.5 group hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors">
      <button
        onClick={isLoggedIn ? onToggle : undefined}
        className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
          item.done
            ? "bg-seagrass border-seagrass"
            : isLoggedIn
              ? "border-gray-300 hover:border-seagrass"
              : "border-gray-200 cursor-default"
        }`}
      >
        {item.done && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span className={`text-sm flex-1 ${item.done ? "line-through text-gray-400" : "text-gray-800"}`}>
        {item.title}
      </span>
      {due && !item.done && (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {due}
        </span>
      )}
      {isLoggedIn && currentUserId === item.createdById && (
        <button
          onClick={onDelete}
          className="text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function TodoPage({
  projectSlug,
  initialLists,
  isLoggedIn,
  currentUserId,
}: {
  projectSlug: string;
  initialLists: TodoList[];
  isLoggedIn: boolean;
  currentUserId: string | null;
}) {
  const [lists, setLists] = useState<TodoList[]>(initialLists);
  const [showNewList, setShowNewList] = useState(false);
  const [, startTransition] = useTransition();

  function handleCreateList(name: string) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: TodoList = {
      id: tempId,
      projectSlug,
      name,
      order: lists.length,
      createdById: currentUserId ?? "",
      createdBy: null,
      items: [],
    };
    setLists((prev) => [...prev, optimistic]);
    startTransition(async () => {
      const result = await createList(projectSlug, name);
      if (result && "list" in result) {
        setLists((prev) =>
          prev.map((l) => (l.id === tempId ? (result.list as TodoList) : l))
        );
      }
    });
  }

  function handleDeleteList(listId: string) {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    startTransition(async () => { await deleteList(listId); });
  }

  function handleAddItem(listId: string, item: TodoItem) {
    setLists((prev) =>
      prev.map((l) => l.id === listId ? { ...l, items: [...l.items, item] } : l)
    );
  }

  function handleToggleItem(listId: string, itemId: string) {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, done: !i.done } : i) }
          : l
      )
    );
    startTransition(async () => { await toggleItem(itemId); });
  }

  function handleDeleteItem(listId: string, itemId: string) {
    setLists((prev) =>
      prev.map((l) => l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l)
    );
    startTransition(async () => { await deleteItem(itemId); });
  }

  return (
    <div className="max-w-2xl">
      {/* Page heading */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">To-dos</h1>
        {isLoggedIn && (
          <button
            onClick={() => setShowNewList(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            <span className="text-base leading-none font-bold">+</span> New list
          </button>
        )}
      </div>

      {/* Empty state */}
      {lists.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm">No to-do lists yet.</p>
          {isLoggedIn && (
            <button
              onClick={() => setShowNewList(true)}
              className="mt-3 text-sm text-blue-500 hover:underline"
            >
              Create the first list
            </button>
          )}
        </div>
      )}

      {/* Lists */}
      {lists.map((list) => (
        <TodoListCard
          key={list.id}
          list={list}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          onDeleteList={handleDeleteList}
          onAddItem={handleAddItem}
          onToggleItem={handleToggleItem}
          onDeleteItem={handleDeleteItem}
        />
      ))}

      {showNewList && (
        <NewListModal
          onSave={handleCreateList}
          onClose={() => setShowNewList(false)}
        />
      )}
    </div>
  );
}
