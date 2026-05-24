import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "noreply@goodtribes.org",
    }),
  ],
  pages: {
    signIn: "/login",
    newUser: "/profile/setup",
  },
  callbacks: {
    session({ session }) {
      return session;
    },
  },
});
