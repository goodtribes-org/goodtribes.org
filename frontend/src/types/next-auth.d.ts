import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    onboardingDone?: boolean;
  }
  interface Session {
    user: {
      id: string;
      onboardingDone: boolean;
    } & DefaultSession["user"];
  }
}
