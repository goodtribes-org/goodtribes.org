import { DefaultSession } from "next-auth";
import type { SiteRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    onboardingDone?: boolean;
    siteRole?: SiteRole;
    acceptedParticipantAgreementAt?: Date | null;
    acceptedCodeOfConductAt?: Date | null;
  }
  interface Session {
    user: {
      id: string;
      onboardingDone: boolean;
      siteRole: SiteRole;
      needsAgreementConsent: boolean;
    } & DefaultSession["user"];
  }
}
