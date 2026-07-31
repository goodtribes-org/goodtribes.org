"use client";

import { useState, useTransition } from "react";
import { createShopItem, updateShopItem, setShopItemActive } from "./actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  costGt: number;
  active: boolean;
};

const EMPTY_FORM = { name: "", description: "", imageUrl: "", costGt: "" };

export default function ShopItemsEditor({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({ name: item.name, description: item.description ?? "", imageUrl: item.imageUrl ?? "", costGt: String(item.costGt) });
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setError(null);
  }

  function handleSave() {
    const costGt = parseFloat(form.costGt);
    setError(null);
    startTransition(async () => {
      const params = { name: form.name, description: form.description, imageUrl: form.imageUrl, costGt };
      if (editingId === "new") {
        const result = await createShopItem(params);
        if (!result.ok || !result.item) {
          setError(result.error ?? "Något gick fel");
          return;
        }
        setItems((prev) => [...prev, result.item as Item]);
      } else {
        const result = await updateShopItem(editingId as string, params);
        if (!result.ok) {
          setError(result.error ?? "Något gick fel");
          return;
        }
        setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, ...params } : i)));
      }
      setEditingId(null);
    });
  }

  function handleToggleActive(item: Item) {
    startTransition(async () => {
      const result = await setShopItemActive(item.id, !item.active);
      if (result.ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i)));
      }
    });
  }

  return (
    <div>
      <ul className="space-y-2 mb-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 border border-dark-slate/10 rounded-lg px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${item.active ? "text-dark-slate" : "text-dark-slate/40 line-through"}`}>
                {item.name}
              </p>
              <p className="text-xs text-dark-slate/50">{item.costGt} GT</p>
            </div>
            <button type="button" onClick={() => startEdit(item)} className="text-xs text-seagrass hover:underline shrink-0">
              Redigera
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleToggleActive(item)}
              className="text-xs text-dark-slate/50 hover:text-dark-slate shrink-0 disabled:opacity-40"
            >
              {item.active ? "Inaktivera" : "Aktivera"}
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-dark-slate/40 italic">Inga varor än.</p>}
      </ul>

      {editingId === null ? (
        <button type="button" onClick={startNew} className="text-sm text-seagrass hover:underline">
          + Lägg till vara
        </button>
      ) : (
        <div className="space-y-3 border-t border-dark-slate/10 pt-4">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Namn"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Beskrivning (valfritt)"
            rows={2}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="Bild-URL (valfritt)"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <input
            value={form.costGt}
            onChange={(e) => setForm((f) => ({ ...f, costGt: e.target.value }))}
            placeholder="Pris i GT"
            type="number"
            min="0"
            step="0.1"
            className="w-full max-w-[160px] border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          {error && <p className="text-xs text-coral">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => setEditingId(null)} className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors">
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Sparar…" : "Spara"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
