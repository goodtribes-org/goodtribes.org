"use client";

import { useState } from "react";
import { computeCardPayees, CREATOR_BONUS_TOKENS, APPROVER_BONUS_TOKENS } from "@/lib/payoutMath";
import { getPriorityTokenValue } from "@/lib/priorityTokens";
import type { Card, Member } from "./kanbanShared";
import type { MoveOverrides } from "@/lib/kanbanMove";

function fmt(tokens: number) {
  return Math.round(tokens * 10) / 10;
}

// Shown before a card actually lands in Done — previews exactly who gets
// paid and lets the approving lead reassign a subtask (or the fallback
// assignee) to the right person before any tokens actually mint, since
// awarding then reversing is more disruptive than just getting it right
// up front (see reverseCardTokens in lib/tokens.ts for the reversal path).
export function TokenPayoutDialog({
  card,
  members,
  onConfirm,
  onCancel,
}: {
  card: Card;
  members: Member[];
  onConfirm: (overrides: MoveOverrides) => void;
  onCancel: () => void;
}) {
  const tokenValue = card.lockedTokenValue ?? getPriorityTokenValue(card.priority);
  const subtasks = card.subtasks ?? [];
  const hasSubtasks = subtasks.length > 0;

  const [subtaskAssignees, setSubtaskAssignees] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(subtasks.map((s) => [s.id, s.completedById ?? null]))
  );
  const [fallbackAssigneeId, setFallbackAssigneeId] = useState<string | null>(card.assigneeId);

  const previewSubtasks = subtasks.map((s) => ({ completedById: subtaskAssignees[s.id] ?? null }));
  const payees = computeCardPayees({
    tokenValue,
    subtasks: previewSubtasks,
    assigneeId: fallbackAssigneeId,
  });

  function memberName(userId: string) {
    return members.find((m) => m.id === userId)?.name ?? "Okänd";
  }

  function handleConfirm() {
    const overrides: MoveOverrides = {};
    if (hasSubtasks) {
      overrides.subtaskCompletedBy = subtaskAssignees;
    } else {
      overrides.assigneeId = fallbackAssigneeId;
    }
    onConfirm(overrides);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-1">Bekräfta tokenutbetalning</h2>
        <p className="text-sm text-gray-500 mb-4">
          "{card.title}" flyttas till Done — så här fördelas {tokenValue} tokens. Stämmer inte vem som gjorde en
          deluppgift kan du ändra det här innan du bekräftar.
        </p>

        {hasSubtasks ? (
          <ul className="space-y-2 mb-4">
            {subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-gray-700">{s.title}</span>
                <select
                  value={subtaskAssignees[s.id] ?? ""}
                  onChange={(e) =>
                    setSubtaskAssignees((prev) => ({ ...prev, [s.id]: e.target.value || null }))
                  }
                  className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">— ingen —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 text-sm mb-4">
            <span className="flex-1 text-gray-700">Ansvarig (får {tokenValue} tokens)</span>
            <select
              value={fallbackAssigneeId ?? ""}
              onChange={(e) => setFallbackAssigneeId(e.target.value || null)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="">— ingen —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
              ))}
            </select>
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tokens som delas ut</p>
          {payees.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Ingen tilldelad deluppgift eller ansvarig — inga tokens delas ut för själva arbetet.
            </p>
          ) : (
            <ul className="space-y-1">
              {payees.map((p) => (
                <li key={p.userId} className="flex justify-between text-sm">
                  <span className="text-gray-700">{memberName(p.userId)}</span>
                  <span className="font-semibold text-seagrass">+{fmt(p.tokens)}</span>
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-1 mt-2 pt-2 border-t border-gray-50">
            <li className="flex justify-between text-sm text-gray-500">
              <span>Kortskapare-bonus ({card.createdBy?.name ?? "Okänd"})</span>
              <span className="font-semibold">+{CREATOR_BONUS_TOKENS}</span>
            </li>
            <li className="flex justify-between text-sm text-gray-500">
              <span>Godkännande-bonus (du)</span>
              <span className="font-semibold">+{APPROVER_BONUS_TOKENS}</span>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-coral text-white hover:bg-watermelon transition-colors"
          >
            Bekräfta och flytta till Done
          </button>
        </div>
      </div>
    </div>
  );
}
