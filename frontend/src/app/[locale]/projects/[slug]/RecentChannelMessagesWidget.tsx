import Image from "next/image";
import Link from "next/link";
import type { useTranslations } from "next-intl";

export type RecentChannelMessage = {
  id: string;
  body: string;
  /** Pre-formatted via relativeTime() in the parent page — keeps this component pure/presentational. */
  timeLabel: string;
  author: { name: string | null; image: string | null };
  room: { name: string | null };
};

export default function RecentChannelMessagesWidget({
  messages,
  slug,
  t,
}: {
  messages: RecentChannelMessage[];
  slug: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (messages.length === 0) return null;

  return (
    <section className="bg-white border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">{t("channelsHeading")}</h2>
        <Link href={`/messages?project=${slug}`} className="text-xs text-seagrass hover:underline">
          {t("openArrowLink")}
        </Link>
      </div>
      <ul className="space-y-3">
        {[...messages].reverse().map((msg) => {
          const initials = (msg.author.name ?? "?").charAt(0).toUpperCase();
          return (
            <li key={msg.id} className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-dry-sage shrink-0 flex items-center justify-center text-[10px] font-bold text-dark-slate overflow-hidden relative mt-0.5">
                {msg.author.image ? (
                  <Image src={msg.author.image} alt={msg.author.name ?? ""} fill className="object-cover" unoptimized />
                ) : initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-dark-slate truncate">
                    {msg.author.name?.split(" ")[0] ?? "?"}
                  </span>
                  <span className="text-[10px] text-dark-slate/40 shrink-0">
                    #{msg.room.name} · {msg.timeLabel}
                  </span>
                </div>
                <p className="text-xs text-dark-slate/70 leading-snug line-clamp-2">
                  {msg.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/messages?project=${slug}`}
        className="mt-3 block text-center text-xs text-white bg-seagrass hover:bg-seagrass/90 rounded-lg py-1.5 transition-colors"
      >
        {t("openChannelsButton")}
      </Link>
    </section>
  );
}
