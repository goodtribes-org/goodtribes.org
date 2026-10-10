import { isRealMember, isSiteAdmin } from "@/lib/authz";

// Interview notes (#276) describe real people — "Änka, 84, bor ensam i
// Hässelby" and their own words — so only the project's members (and site
// admins) see them. What the team learned from them (the INTERVIEW_SYNTHESIS
// insight) stays as open as the rest of the project. AI calls that read the
// notes run for members and are unaffected.
export async function canSeeInterviewNotes(projectId: string, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return (await isRealMember(projectId, userId)) || (await isSiteAdmin(userId));
}
