import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    onboarded?: boolean;
    onboardingDone?: boolean;
  }
  interface Session {
    user: {
      id: string;
      onboarded: boolean;
      onboardingDone: boolean;
    } & DefaultSession["user"];
  }
}
