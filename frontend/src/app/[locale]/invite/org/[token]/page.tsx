export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { acceptOrgInvite } from "./actions";
import type { Locale } from "next-intl";


export default async function AcceptOrgInvitePage({
  params,
}: {
  params: Promise<{ locale: Locale; token: string }>;
}) {
  const { locale, token } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "AcceptOrgInvitePage" }),
  ]);

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: { select: { name: true, slug: true } } },
  });

  if (!invite) notFound();

  const expired = invite.expiresAt < new Date();
  const used = !!invite.usedAt;

  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <h1 className="text-2xl font-bold text-dark-slate mb-2">{t("heading")}</h1>

      {expired || used ? (
        <div className="mt-6 p-6 border border-muted-teal/30 rounded-lg">
          <p className="text-dark-slate/60 mb-4">
            {used ? t("alreadyUsed") : t("expired")}
          </p>
          <Link href="/org" className="text-coral hover:underline text-sm">
            {t("browseOrgsLink")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 p-6 border border-muted-teal/30 rounded-lg">
          <p className="text-dark-slate/70 mb-2 text-sm">{t("invitedTo")}</p>
          <p className="text-xl font-bold text-dark-slate mb-6">{invite.org.name}</p>

          {session?.user?.id ? (
            <form action={acceptOrgInvite.bind(null, token)}>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-coral text-white font-bold rounded hover:bg-watermelon transition-colors"
              >
                {t("acceptButton")}
              </button>
            </form>
          ) : (
            <div>
              <p className="text-sm text-dark-slate/60 mb-4">{t("loginPrompt")}</p>
              <Link
                href={`/login?callbackUrl=/invite/org/${token}`}
                className="inline-block px-6 py-3 bg-coral text-white font-bold rounded hover:bg-watermelon transition-colors"
              >
                {t("loginButton")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
