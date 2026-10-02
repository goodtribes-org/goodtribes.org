import { prisma } from "@/lib/prisma";

// "Someone worked in a tool" — logged as an ActivityEvent of type
// TOOL_EDITED with payload { tool }, so work in the canvas and other tools
// counts in "Pulsen i dina projekt" (lib/yourTribe.ts) instead of a project
// that only works in its canvas looking like it stands still. Throttled to
// one event per person, project and tool per THROTTLE_MINUTES, since tools
// save on every edit. Best-effort: never throws, never blocks the save.
//
// Deliberately a plain server module, not "use server": a Server Action
// export would take a userId from the client.

export const TOOL_EDITED = "tool_edited";
export const THROTTLE_MINUTES = 30;

// Tool keys are the ActivityFeed / YourTribe / PersonalBar translation keys
// under `tools.<key>`.
export type ToolKey = "project" | "leanCanvas" | "valueProposition" | "impactModel" | "interviews" | "marketScan" | "wiki" | "polls";

export async function logToolWork(projectId: string, userId: string, tool: ToolKey): Promise<void> {
  try {
    const since = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000);
    const recent = await prisma.activityEvent.findFirst({
      where: { projectId, userId, type: TOOL_EDITED, createdAt: { gte: since }, payload: { path: ["tool"], equals: tool } },
      select: { id: true },
    });
    if (recent) return;
    await prisma.activityEvent.create({ data: { projectId, userId, type: TOOL_EDITED, payload: { tool } } });
  } catch {
    // best-effort
  }
}
