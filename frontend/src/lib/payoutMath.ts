// Pure payout math shared between the server (tokens.ts, which mints for
// real) and the client (the pre-move payout preview/edit dialog). No Prisma
// import here on purpose — this file must stay safe to import from a "use
// client" component.

export type SubtaskForPayout = { completedById: string | null };

export const CREATOR_BONUS_TOKENS = 5;
export const APPROVER_BONUS_TOKENS = 5;

// A card's fixed priority-value token pool is split between whoever completed
// its subtasks, weighted by how many subtasks each person completed. Falls
// back to the assignee when there's no subtask completer to attribute to —
// either the card has no subtasks, or (for cards finished before this field
// existed) the subtasks are done but nobody's recorded against them.
export function computeCardPayees(params: {
  tokenValue: number;
  subtasks: SubtaskForPayout[];
  assigneeId: string | null;
}): Array<{ userId: string; tokens: number }> {
  const attributed = params.subtasks.filter((s): s is { completedById: string } => !!s.completedById);
  if (attributed.length > 0) {
    const counts = new Map<string, number>();
    for (const s of attributed) counts.set(s.completedById, (counts.get(s.completedById) ?? 0) + 1);
    return Array.from(counts.entries()).map(([userId, count]) => ({
      userId,
      tokens: (params.tokenValue * count) / attributed.length,
    }));
  }
  if (params.assigneeId) return [{ userId: params.assigneeId, tokens: params.tokenValue }];
  return [];
}
