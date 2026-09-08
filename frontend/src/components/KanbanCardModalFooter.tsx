"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Extracted from KanbanCardModal — confirmDelete is purely local to the
// footer (nothing else in the modal reads it), so it's safe to own here.
export default function KanbanCardModalFooter({
  isLoggedIn,
  canDelete,
  canSave,
  saveDisabledTitle,
  isNew,
  onSave,
  onClose,
  onConfirmDelete,
}: {
  isLoggedIn: boolean;
  canDelete: boolean;
  canSave: boolean;
  saveDisabledTitle?: string;
  isNew?: boolean;
  onSave: () => void;
  onClose: () => void;
  onConfirmDelete: () => void;
}) {
  const tCard = useTranslations("KanbanCardModal");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isLoggedIn) return null;

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
      <button
        onClick={onSave}
        disabled={!canSave}
        title={!canSave ? saveDisabledTitle : undefined}
        className="bg-seagrass text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-seagrass/80 disabled:opacity-40 transition-colors"
      >
        {isNew ? tCard("saveButtonCreate") : tCard("saveButtonUpdate")}
      </button>
      <button
        onClick={onClose}
        className="text-sm font-medium text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {tCard("cancelButton")}
      </button>
      {canDelete && (
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{tCard("deleteConfirmPrompt")}</span>
              <button
                onClick={onConfirmDelete}
                className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors"
              >
                {tCard("deleteConfirmYes")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {tCard("cancelButton")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {tCard("deleteButton")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
