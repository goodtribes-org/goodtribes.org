"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRealMember } from "@/lib/authz";
import { isValidLegalType, LEGAL_TYPE_LABEL } from "@/lib/legalType";

// Any real (non-FOLLOWER) member can propose a legal_type change — mirrors
// createPoll's existing permissiveness (PRD 4c: "Projektets medlemmar kan
// rösta... om att föreslå en ändring"). Creates the linked Tribe-Token-
// weighted Poll directly (rather than calling createPoll, which always
// redirects) so the Poll.id can be attached to the request.
export async function proposeLegalTypeChange(projectId: string, projectSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  if (!(await isRealMember(projectId, userId))) redirect(`/projects/${projectSlug}/legal-type`);

  const requestedType = (formData.get("requestedType") as string | null)?.trim() ?? "";
  if (!isValidLegalType(requestedType)) return;

  const poll = await prisma.poll.create({
    data: {
      projectSlug,
      createdById: userId,
      title: `Byt juridisk form till "${LEGAL_TYPE_LABEL[requestedType]}"?`,
      type: "legal_type_change",
      options: {
        create: [
          { label: "Ja", sortOrder: 0 },
          { label: "Nej", sortOrder: 1 },
        ],
      },
    },
  });

  await prisma.legalTypeChangeRequest.create({
    data: {
      projectId,
      requestedType,
      pollId: poll.id,
      requestedById: userId,
    },
  });

  revalidatePath(`/projects/${projectSlug}/legal-type`);
  redirect(`/projects/${projectSlug}/polls/${poll.id}`);
}
