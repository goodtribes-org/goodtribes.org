import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { acceptInvite } from "./actions";
import SignOutButton from "./SignOutButton";
import type { Locale } from "next-intl";


export default async function AcceptInvitePage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "AcceptInvitePage" }),
  ]);

  const invite = await prisma.projectInvite.findUnique({
    where: { token },
    include: { project: { select: { title: true, slug: true } }, createdBy: { select: { name: true } } },
  });

  if (!invite) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center">
        <p className="text-xl font-bold text-dark-slate mb-2">{t("notFoundHeading")}</p>
        <p className="text-dark-slate/60 mb-6">{t("notFoundIntro")}</p>
        <Link href="/projects" className="text-coral hover:underline">{t("browseProjectsLink")}</Link>
      </div>
    );
  }

  if (invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center">
        <p className="text-xl font-bold text-dark-slate mb-2">{t("expiredHeading")}</p>
        <p className="text-dark-slate/60 mb-6">{t("expiredIntro")}</p>
        <Link href="/projects" className="text-coral hover:underline">{t("browseProjectsLink")}</Link>
      </div>
    );
  }

  const emailMismatch = !!(
    session?.user?.email &&
    invite.email &&
    session.user.email.toLowerCase() !== invite.email.toLowerCase()
  );

  return (
    <div className="max-w-md mx-auto mt-24">
      <div className="border border-muted-teal/40 rounded-xl p-8 text-center">
        <p className="text-sm text-dark-slate/50 mb-1">{t("invitedBy", { name: invite.createdBy.name ?? t("unknownInviter") })}</p>
        <h1 className="text-2xl font-bold text-dark-slate mb-2">{invite.project.title}</h1>
        <p className="text-sm text-dark-slate/60 mb-8">{t("joinIntro")}</p>

        {emailMismatch ? (
          <div>
            <p className="text-sm text-coral mb-4">
              {t.rich("emailMismatch", {
                inviteEmail: invite.email ?? "",
                sessionEmail: session!.user!.email ?? "",
                email: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <SignOutButton callbackUrl={`/invite/${token}`} />
          </div>
        ) : session?.user?.id ? (
          <form action={acceptInvite.bind(null, token)}>
            <button
              type="submit"
              className="w-full bg-coral text-white font-semibold py-3 rounded-lg hover:bg-watermelon transition-colors"
            >
              {t("acceptButton")}
            </button>
          </form>
        ) : (
          <Link
            href={`/login?callbackUrl=/invite/${token}`}
            className="block w-full bg-coral text-white font-semibold py-3 rounded-lg hover:bg-watermelon transition-colors"
          >
            {t("loginToAccept")}
          </Link>
        )}
      </div>
    </div>
  );
}
