import { DISPLAY_PHASES, toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

export function isOverdue(date: Date | null, status: string): boolean {
  if (!date || status === "done") return false;
  return date < new Date();
}

export function getMilestoneTimelineStatus(
  dueDate: Date | null,
  status: string
): "done" | "overdue" | "upcoming" {
  if (status === "done") return "done";
  return isOverdue(dueDate, status) ? "overdue" : "upcoming";
}

export type PhaseTimelineStatus = "completed" | "in_progress" | "at_risk" | "upcoming";

export function getPhaseTimelineStatus(args: {
  phaseValue: ProjectPhaseValue;
  currentPhase: ProjectPhaseValue;
  targetDate: Date | null;
}): PhaseTimelineStatus {
  const order = DISPLAY_PHASES.map((p) => p.value);
  const phaseIdx = order.indexOf(toDisplayPhase(args.phaseValue));
  const currentIdx = order.indexOf(toDisplayPhase(args.currentPhase));
  if (phaseIdx < currentIdx) return "completed";
  if (phaseIdx > currentIdx) return "upcoming";
  if (args.targetDate && args.targetDate < new Date()) return "at_risk";
  return "in_progress";
}
