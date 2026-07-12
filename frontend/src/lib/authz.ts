import { prisma } from "@/lib/prisma";
import type { SiteRole, ProjectRole } from "@prisma/client";

export type { ProjectRole };

export const PROJECT_LEAD_ROLES: ProjectRole[] = ["FOUNDER", "ADMIN"];

// Plain-string convenience for display-only checks against a role value
// already fetched from Prisma (typed `string`, not the ProjectRole union).
export function isLeadRole(role: string | null | undefined): boolean {
  return !!role && (PROJECT_LEAD_ROLES as readonly string[]).includes(role);
}

export async function getProjectRole(
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return (member?.role as ProjectRole | undefined) ?? null;
}

export async function hasProjectRole(
  projectId: string,
  userId: string,
  allowed: ProjectRole[]
): Promise<boolean> {
  const role = await getProjectRole(projectId, userId);
  return role !== null && allowed.includes(role);
}

// Throws for Server Actions/route handlers that should hard-stop on
// unauthorized access. Prefer hasProjectRole() for page components deciding
// what to render. Site admins/owners bypass project-level checks by default,
// since the site level exists to intervene when a project breaks the rules —
// pass { allowSiteAdmin: false } to opt out for a specific call site.
export async function requireProjectRole(
  projectId: string,
  userId: string,
  allowed: ProjectRole[],
  opts: { allowSiteAdmin?: boolean } = {}
): Promise<void> {
  const { allowSiteAdmin = true } = opts;
  if (await hasProjectRole(projectId, userId, allowed)) return;
  if (allowSiteAdmin && (await isSiteAdmin(userId))) return;
  throw new Error("Forbidden");
}

export function isSiteAdminRole(siteRole: SiteRole | null | undefined): boolean {
  return siteRole === "ADMIN" || siteRole === "OWNER";
}

export function isSiteOwnerRole(siteRole: SiteRole | null | undefined): boolean {
  return siteRole === "OWNER";
}

// Re-fetches the User row rather than trusting a possibly-stale session —
// prefer this over session.user.siteRole for anything destructive.
export async function isSiteAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { siteRole: true } });
  return isSiteAdminRole(user?.siteRole);
}

export async function isSiteOwner(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { siteRole: true } });
  return isSiteOwnerRole(user?.siteRole);
}

export async function requireSiteAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isSiteAdminRole(user.siteRole)) {
    throw new Error("Forbidden");
  }
  return user;
}

// Real membership excludes FOLLOWER — a lightweight, non-member
// following relationship that shouldn't grant write access to project
// features (kanban comments, etc).
export async function isRealMember(projectId: string, userId: string): Promise<boolean> {
  const role = await getProjectRole(projectId, userId);
  return role !== null && role !== "FOLLOWER";
}

// True if userId is the sole remaining founder on this project — used to
// block removing/demoting the last founder (a project can have any number
// of equal-authority founders; this only fires when exactly one remains).
export async function isLastFounder(projectId: string, userId: string): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member || member.role !== "FOUNDER") return false;

  const founderCount = await prisma.projectMember.count({
    where: { projectId, role: "FOUNDER" },
  });
  return founderCount <= 1;
}
