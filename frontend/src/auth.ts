import NextAuth from "next-auth";
import { cookies } from "next/headers";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email";
import { authConfig } from "@/auth.config";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { emailLocaleFromMagicLink, emailLocaleFromPath, magicLinkEmail, welcomeEmail } from "@/lib/authEmails";


const APP_URL = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

// Magic-link sign-in was completely unrated — anyone could trigger unlimited
// Resend sends to any address (email-bombing a target) or hammer the
// endpoint across many addresses from one source. Two independent limits:
// per-target-email (protects a specific inbox) and per-IP (protects against
// one source spraying many addresses). Both fail open on a Redis outage,
// same as every other checkRateLimit call site.
// The per-IP limit is generous because a whole room on one wifi shares an
// address (≈50 people at an event); MAGIC_LINK_IP_LIMIT can tune it.
const MAGIC_LINK_EMAIL_LIMIT = 3;
const MAGIC_LINK_IP_LIMIT = Number(process.env.MAGIC_LINK_IP_LIMIT) || 100;
const MAGIC_LINK_WINDOW_SECONDS = 10 * 60;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // `@auth/prisma-adapter@2.11.3`'s bundled types (last published before
  // Prisma 7 shipped) expect `PrismaClient | ReturnType<PrismaClient["$extends"]>`
  // computed against Prisma's own PrismaClient generics, and fail to
  // structurally match a Prisma 7 client constructed with a driver adapter
  // (`new PrismaClient({ adapter })`, see @/lib/prisma.ts) even though the
  // printed type names look identical — a known upstream gap, longstanding
  // even pre-Prisma-7 for extended clients (e.g. nextauthjs/next-auth#6078,
  // #9413) and not yet fixed for Prisma 7's driver-adapter clients specifically.
  // No newer @auth/prisma-adapter version exists yet (2.11.3 is latest as of
  // this migration). PrismaAdapter only ever calls plain `prisma.<model>.*`
  // methods that exist on any PrismaClient regardless of this type mismatch —
  // verified against a real local Postgres (read/write/migrate all succeeded,
  // see PR description) — so this is a type-only escape hatch, not a runtime
  // risk. Revisit/remove once @auth/prisma-adapter ships Prisma-7-aware types.
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "noreply@goodtribes.org",
      async sendVerificationRequest({ identifier, url, provider, request }) {
        const ip = getClientIp(request);
        const [emailAllowed, ipAllowed] = await Promise.all([
          checkRateLimit(`rl:magic-link:email:${identifier}`, MAGIC_LINK_EMAIL_LIMIT, MAGIC_LINK_WINDOW_SECONDS),
          checkRateLimit(`rl:magic-link:ip:${ip}`, MAGIC_LINK_IP_LIMIT, MAGIC_LINK_WINDOW_SECONDS),
        ]);
        if (!emailAllowed || !ipAllowed) {
          logger.warn("magic-link sign-in rate limited", { identifier, ip, emailAllowed, ipAllowed });
          throw new Error("Too many sign-in attempts — please try again in a few minutes.");
        }

        // Same request @auth/core's default Resend provider makes — kept
        // here (rather than importing its internal template helpers) so the
        // throw-on-failure contract NextAuth expects from
        // sendVerificationRequest is preserved explicitly.
        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            ...magicLinkEmail(emailLocaleFromMagicLink(url), url, host),
          }),
        });
        if (!res.ok) throw new Error("Resend error: " + JSON.stringify(await res.json()));
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.onboardingDone = (user as { onboardingDone?: boolean }).onboardingDone ?? false;
      session.user.siteRole = user.siteRole ?? "USER";
      session.user.needsAgreementConsent =
        !user.acceptedParticipantAgreementAt || !user.acceptedCodeOfConductAt;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      // Runs inside the magic-link callback request, where NextAuth's
      // callback-url cookie still says where the person is headed.
      let callbackUrl: string | undefined;
      try {
        const jar = await cookies();
        callbackUrl = (jar.get("__Secure-authjs.callback-url") ?? jar.get("authjs.callback-url"))?.value;
      } catch {
        // no request context — fall back to Swedish
      }
      await sendEmail({ to: user.email, ...welcomeEmail(emailLocaleFromPath(callbackUrl), APP_URL) });
    },
  },
});
