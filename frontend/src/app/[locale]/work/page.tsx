import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WorkPage" });
  return buildMetadata({ locale, path: "/work", title: t("pageTitle") });
}

export default async function WorkPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "WorkPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const orgs = await prisma.organisation.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true, imageUrl: true },
  });

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">{t("heading")}</h1>
        <p className="text-lg text-dark-slate/70">{t("intro")}</p>
      </div>

      {orgs.length === 0 ? (
        <p className="text-muted-teal italic">
          {t("noOrgsIntro")}{" "}
          <Link href="/org" className="underline hover:text-seagrass">
            {t("exploreOrgsLink")}
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/work/${org.slug}/messages`}
              className="border border-muted-teal rounded-lg p-6 flex gap-4 hover:border-seagrass transition-colors"
            >
              <div className="w-14 h-14 rounded-lg bg-dry-sage flex-shrink-0 overflow-hidden">
                {org.imageUrl ? (
                  <img src={org.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl text-dark-slate/30">
                    🏢
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{org.name}</h2>
                {org.description && (
                  <p className="text-sm text-dark-slate/70 mt-1 line-clamp-2">{org.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
