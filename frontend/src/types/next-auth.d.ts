import { DefaultSession } from "next-auth";
import type { SiteRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    onboardingDone?: boolean;
    siteRole?: SiteRole;
  }
  interface Session {
    user: {
      id: string;
      onboardingDone: boolean;
      siteRole: SiteRole;
    } & DefaultSession["user"];
  }
}
