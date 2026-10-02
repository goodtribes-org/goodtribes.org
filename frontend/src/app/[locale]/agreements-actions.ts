"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SIGNUP_CONSENT_COOKIE } from "@/lib/signupConsent";

// Records acceptance of the Participant Agreement and Code of Conduct —
// called by the global ConsentGate (existing users who haven't accepted yet).
// Never overwrites an already-set timestamp — accepting twice keeps the
// original acceptance date.
export async function acceptAgreements(
  participantAgreement: boolean,
  codeOfConduct: boolean
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  if (!participantAgreement || !codeOfConduct) {
    return { error: "Both agreements must be accepted" };
  }

  return recordAcceptance(session.user.id);
}

// The signup form's checkboxes fire at magic-link-request time, before the
// account row exists, so the form leaves a short-lived cookie with the email
// it accepted for. On the first authenticated page load the ConsentGate calls
// this, and the acceptance is recorded only when the cookie names the address
// that actually signed in — a cookie another site can't set, so a link alone
// can never accept the agreements on someone's behalf. Without a matching
// cookie the gate just asks, as before.
export async function acceptAgreementsFromSignup(): Promise<{ ok: boolean }> {
  const session = await auth();
  const jar = await cookies();
  const accepted = jar.get(SIGNUP_CONSENT_COOKIE)?.value;
  jar.delete(SIGNUP_CONSENT_COOKIE);
  const email = session?.user?.email?.toLowerCase();
  if (!session?.user?.id || !email || !accepted) return { ok: false };
  if (decodeURIComponent(accepted).toLowerCase() !== email) return { ok: false };
  const result = await recordAcceptance(session.user.id);
  return { ok: "ok" in result };
}

async function recordAcceptance(userId: string): Promise<{ error: string } | { ok: true }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { acceptedParticipantAgreementAt: true, acceptedCodeOfConductAt: true },
  });
  if (!user) return { error: "Not found" };

  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      acceptedParticipantAgreementAt: user.acceptedParticipantAgreementAt ?? now,
      acceptedCodeOfConductAt: user.acceptedCodeOfConductAt ?? now,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
