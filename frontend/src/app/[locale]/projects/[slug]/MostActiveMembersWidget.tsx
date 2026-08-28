import Image from "next/image";
import Link from "next/link";
import { toProxyUrl } from "@/lib/storageUrl";
import type { useTranslations } from "next-intl";

export type ActiveMember = {
  id: string;
  name: string;
  image: string | null;
  showProfile: boolean;
  tokens: number;
};

export default function MostActiveMembersWidget({
  members,
  slug,
  t,
}: {
  members: ActiveMember[];
  slug: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (members.length === 0) return null;

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">{t("mostActiveMembersHeading")}</h2>
        <Link href={`/projects/${slug}/tokens`} className="text-xs text-seagrass hover:underline">
          {t("viewAllTokensLink")}
        </Link>
      </div>
      <ol className="space-y-2">
        {members.map((m, i) => {
          const initials = m.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const avatarContent = m.image ? (
            <Image src={toProxyUrl(m.image)} alt={m.name} fill unoptimized className="object-cover" />
          ) : (
            initials
          );
          const row = (
            <div className="flex items-center gap-3">
              <span className="w-5 text-center text-xs font-bold text-dark-slate/40">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden relative">
                {avatarContent}
              </div>
              <span className="flex-1 min-w-0 text-sm text-dark-slate truncate">{m.name}</span>
              <span className="text-xs font-semibold text-coral">{Math.round(m.tokens)} {t("pointsAbbreviation")}</span>
            </div>
          );
          return (
            <li key={m.id}>
              {m.showProfile ? (
                <Link
                  href={`/members/${m.id}`}
                  className="block hover:bg-dry-sage/20 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors"
                >
                  {row}
                </Link>
              ) : (
                <div className="px-1.5 py-1 -mx-1.5">{row}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
