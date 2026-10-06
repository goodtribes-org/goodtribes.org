import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { toProxyUrl } from "@/lib/storageUrl";
import { daysLeft, isOpenForIdeas } from "@/lib/challenges";

export type ChallengeCardData = {
  slug: string;
  title: string;
  imageUrl: string | null;
  supportText: string | null;
  closesAt: Date;
  publishedAt: Date | null;
  organisation: { name: string; slug: string };
  _count: { ideas: number };
};

// A challenge (#228) as a card: who asks, the question, how long it's
// open, how many ideas so far and whether there's support on offer.
export default async function ChallengeCard({ challenge, locale }: { challenge: ChallengeCardData; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Challenges" });
  const open = isOpenForIdeas(challenge);
  const days = daysLeft(challenge.closesAt);
  return (
    <Link
      href={`/challenges/${challenge.slug}`}
      className="flex w-full flex-col overflow-hidden rounded-2xl border-2 border-seagrass bg-white transition-shadow hover:shadow-md"
    >
      {challenge.imageUrl ? (
        <img src={toProxyUrl(challenge.imageUrl)} alt="" className="aspect-[3/1] w-full object-cover" />
      ) : (
        <div className="aspect-[3/1] w-full bg-gradient-to-br from-seagrass to-[#1f6f5c]" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-seagrass">
          {t("cardEyebrow", { organisation: challenge.organisation.name })}
          {" · "}
          {!challenge.publishedAt ? t("draft") : open ? t("daysLeft", { days }) : t("closed")}
        </p>
        <p className="mt-1 text-base font-bold leading-snug text-dark-slate">{challenge.title}</p>
        <p className="mt-auto pt-3 text-xs text-dark-slate/55">
          {t("ideaCount", { count: challenge._count.ideas })}
          {challenge.supportText ? ` · ${t("hasSupport")}` : ""}
        </p>
      </div>
    </Link>
  );
}
