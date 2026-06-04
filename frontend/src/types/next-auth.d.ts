import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    onboarded?: boolean;
  }
  interface Session {
    user: {
      id: string;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}
