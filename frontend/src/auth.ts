import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email";


const APP_URL = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

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
    error: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.onboardingDone = (user as { onboardingDone?: boolean }).onboardingDone ?? false;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      await sendEmail({
        to: user.email,
        subject: "Welcome to GoodTribes!",
        html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e2a">
  <h1 style="font-size:24px;margin-bottom:8px">Welcome to GoodTribes 👋</h1>
  <p style="color:#4a5e5a;line-height:1.6">
    You're now part of a community connecting skilled volunteers with
    impact-driven organisations. Let's set up your profile so others
    can find and collaborate with you.
  </p>
  <a href="${APP_URL}/profile/setup"
     style="display:inline-block;margin-top:20px;padding:12px 24px;background:#e85d4a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
    Complete your profile →
  </a>
  <p style="margin-top:32px;font-size:13px;color:#8aa8a0">
    Browse <a href="${APP_URL}/projects" style="color:#2d7a6e">projects</a>,
    explore <a href="${APP_URL}/members" style="color:#2d7a6e">members</a>, or
    check out <a href="${APP_URL}/org" style="color:#2d7a6e">organisations</a> —
    whenever you're ready.
  </p>
</div>`,
      });
    },
  },
});
