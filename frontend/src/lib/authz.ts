import { prisma } from "@/lib/prisma";

// Pre-enum string values, matching ProjectMember.role / ProjectInvite.role today.
// Will become a real Prisma enum in a later migration; keep this union in sync
// with the schema until then.
export type ProjectRole = "owner" | "admin" | "collaborator" | "follower";

export const PROJECT_LEAD_ROLES: ProjectRole[] = ["owner", "admin"];

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
// what to render.
export async function requireProjectRole(
  projectId: string,
  userId: string,
  allowed: ProjectRole[]
): Promise<void> {
  if (!(await hasProjectRole(projectId, userId, allowed))) {
    throw new Error("Forbidden");
  }
}

// Real membership excludes "follower" — a lightweight, non-member
// following relationship that shouldn't grant write access to project
// features (kanban comments, etc).
export async function isRealMember(projectId: string, userId: string): Promise<boolean> {
  const role = await getProjectRole(projectId, userId);
  return role !== null && role !== "follower";
}

// True if userId is the sole remaining "owner" on this project — used to
// block removing/demoting the last founder.
export async function isLastFounder(projectId: string, userId: string): Promise<boolean> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member || member.role !== "owner") return false;

  const founderCount = await prisma.projectMember.count({
    where: { projectId, role: "owner" },
  });
  return founderCount <= 1;
}
