"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { COLUMNS } from "./kanbanShared";
import { COLUMN_LABEL_KEYS } from "@/lib/kanbanColumns";

// Extracted from KanbanBoard.tsx: the "N hidden columns" dropdown button +
// menu. Fully self-contained — its open/closed toggle state
// (`hiddenColumnsMenuOpen` in the original) was never read anywhere else in
// KanbanBoard, so it now lives entirely inside this component instead of the
// parent's state. `hiddenColumnKeys` is still derived from the parent's
// `columnModes` state (that state drives the whole board's column layout,
// not just this menu, so it stays in KanbanBoard) and `onShowColumn` calls
// back into the parent's `setColumnMode`.
export function HiddenColumnsMenu({
  hiddenColumnKeys,
  onShowColumn,
}: {
  hiddenColumnKeys: string[];
  onShowColumn: (colKey: string) => void;
}) {
  const t = useTranslations("KanbanBoard");
  const tShared = useTranslations("KanbanShared");
  const [open, setOpen] = useState(false);

  if (hiddenColumnKeys.length === 0) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 hover:border-gray-400 transition-colors"
      >
        {t("hiddenColumnsButton", { count: hiddenColumnKeys.length })}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
            {COLUMNS.filter((col) => hiddenColumnKeys.includes(col.key)).map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => onShowColumn(col.key)}
                className="w-full text-left text-sm px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t("showColumn", { column: tShared(COLUMN_LABEL_KEYS[col.key]) })}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
