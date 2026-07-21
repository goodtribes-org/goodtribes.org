import { hasOrgRole, ORG_LEAD_ROLES } from "@/lib/org-authz";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";

export async function canProposePartnership(
  side: "org" | "project",
  organisationId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  if (side === "org") return hasOrgRole(organisationId, userId, ORG_LEAD_ROLES);
  return hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES);
}

// The side that DIDN'T propose must be the one to accept/decline — an
// initiator can't also approve their own proposal.
export async function canRespondToPartnership(
  proposedBy: string,
  organisationId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  if (proposedBy === "org") return hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES);
  return hasOrgRole(organisationId, userId, ORG_LEAD_ROLES);
}

// Either side's leads can revoke an active partnership unilaterally.
export async function canRevokePartnership(
  organisationId: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  return (
    (await hasOrgRole(organisationId, userId, ORG_LEAD_ROLES)) ||
    (await hasProjectRole(projectId, userId, PROJECT_LEAD_ROLES))
  );
}
