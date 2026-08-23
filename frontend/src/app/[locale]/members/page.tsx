import type { Metadata } from "next";
import Link from "next/link";
import MembersFilter from "@/components/MembersFilter";
import Pagination from "@/components/Pagination";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { getCachedMembersPage } from "@/lib/listCache";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MembersPage" });
  return buildMetadata({ locale, path: "/members", title: t("pageTitle"), description: t("metaDescription") });
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; page?: string }>;
}) {
  const { skill, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const t = await getTranslations("MembersPage");

  const { total, members, allSkills } = await getCachedMembersPage(skill, page);

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">{t("pageTitle")}</h1>
        <p className="text-lg text-dark-slate/70">{t("subtitle")}</p>
      </div>

      <MembersFilter skills={allSkills} activeSkill={skill} total={total} />

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-2">
            {skill ? t("noMembersWithSkill") : t("noMembersAtAll")}
          </p>
          <p className="text-sm text-dark-slate/40 mb-4">
            {t("wantToAppearHere")}{" "}
            <Link href="/profile/setup" className="text-coral hover:underline">
              {t("setUpYourProfile")}
            </Link>
          </p>
          {skill && (
            <Link href="/members" className="text-xs text-dark-slate/40 hover:underline">{t("clearFilter")}</Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {members.map((member) => {
              const initials = member.name!
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="border border-muted-teal rounded-lg p-6 flex gap-4 hover:border-seagrass transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-lg font-semibold text-dark-slate overflow-hidden relative">
                    {member.image
                      ? <img src={member.image} alt={member.name ?? ""} className="w-14 h-14 rounded-full object-cover" />
                      : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold truncate">{member.name}</h2>
                    {member.bio && (
                      <p className="text-sm text-dark-slate/70 mt-1 line-clamp-2">{member.bio}</p>
                    )}
                    {member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.skills.map(({ skill }) => (
                          <span
                            key={skill.name}
                            className="text-xs bg-dry-sage text-dark-slate px-2 py-0.5 rounded-full"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={{ skill, page: pageStr }} basePath="/members" />
        </>
      )}
    </div>
  );
}
