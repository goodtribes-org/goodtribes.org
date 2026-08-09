"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Records acceptance of the Participant Agreement and Code of Conduct —
// called both by the global ConsentGate (existing users, and new users on
// their first authenticated page load, since the signup form's checkboxes
// fire at magic-link-request time, before the account row even exists, and
// can't be bound to the later out-of-band account-creation event) and,
// eventually, could be called right after signup too. Never overwrites an
// already-set timestamp — accepting twice keeps the original acceptance date.
export async function acceptAgreements(
  participantAgreement: boolean,
  codeOfConduct: boolean
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (!participantAgreement || !codeOfConduct) {
    return { error: "Both agreements must be accepted" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { acceptedParticipantAgreementAt: true, acceptedCodeOfConductAt: true },
  });
  if (!user) return { error: "Not found" };

  const now = new Date();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      acceptedParticipantAgreementAt: user.acceptedParticipantAgreementAt ?? now,
      acceptedCodeOfConductAt: user.acceptedCodeOfConductAt ?? now,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
