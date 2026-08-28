import type { getTranslations } from "next-intl/server";

/**
 * Pure formatting/labeling helpers shared by the Workplace page and its
 * per-tab components. Extracted so the tab components (WorkplaceOverviewTab,
 * WorkplaceTokensTab, WorkplaceKudosTab, WorkplaceMentorInboxTab,
 * WorkplaceActivityTab) don't each need to reimplement or re-derive this
 * logic — single source of truth, same reasoning PR #67 used for keeping
 * relativeTime()-style formatting in one place.
 */

export type T = Awaited<ReturnType<typeof getTranslations>>;

export function roleLabel(t: T, role: string): string {
  switch (role) {
    case "FOUNDER":
      return t("roleLabelFounder");
    case "ADMIN":
      return t("roleLabelAdmin");
    case "MEMBER":
      return t("roleLabelMember");
    case "FOLLOWER":
      return t("roleLabelFollower");
    default:
      return role;
  }
}

export function formatDue(t: T, date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return t("dueOverdue", { days: Math.abs(diff) });
  if (diff === 0) return t("dueToday");
  if (diff === 1) return t("dueTomorrow");
  return t("dueInDays", { days: diff });
}

export function isDueSoon(date: Date | null): boolean {
  if (!date) return false;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return diff <= 2;
}

const ACTIVITY_ICON: Record<string, string> = {
  member_joined: "👋",
  update_posted: "✍️",
  milestone_added: "🎯",
  milestone_completed: "✅",
};

export function activityIcon(type: string): string {
  return ACTIVITY_ICON[type] ?? "📌";
}

export function activityDescription(t: T, type: string, projectTitle: string): string {
  switch (type) {
    case "member_joined":
      return t("activityMemberJoined", { project: projectTitle });
    case "update_posted":
      return t("activityUpdatePosted", { project: projectTitle });
    case "milestone_added":
      return t("activityMilestoneAdded", { project: projectTitle });
    case "milestone_completed":
      return t("activityMilestoneCompleted", { project: projectTitle });
    default:
      return `${type} ${projectTitle}`;
  }
}

export function relativeTime(t: T, date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 24) return t("timeHoursAgo", { hours: diffH <= 1 ? 1 : diffH });
  const diffD = Math.floor(diffMs / 86400000);
  return t("timeDaysAgo", { days: diffD === 0 ? 1 : diffD });
}

export type DateGroupKey = "today" | "yesterday" | "thisWeek" | "earlier";

export function activityDateGroup(date: Date): DateGroupKey {
  const now = new Date();
  const d = new Date(date);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

  if (d >= todayStart) return "today";
  if (d >= yesterdayStart) return "yesterday";
  if (d >= weekStart) return "thisWeek";
  return "earlier";
}

export function dateGroupLabel(t: T, key: DateGroupKey): string {
  switch (key) {
    case "today":
      return t("groupToday");
    case "yesterday":
      return t("groupYesterday");
    case "thisWeek":
      return t("groupThisWeek");
    case "earlier":
      return t("groupEarlier");
  }
}
