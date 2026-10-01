import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import type { PulseItem } from "@/lib/activityFeed";
import { toProxyUrl } from "@/lib/storageUrl";
import { INK, LINK, MUTED, SUBTLE, SectionHeader, card, wrap } from "./Sections";
import { newHomeDisplayFont } from "./fonts";

// "Vi är N eldsjälar": the people behind the platform, high up on the start
// page — newest members' faces, and what people have done lately told as a
// sentence about a person ("Anna slutförde uppgiften … i Skolmatappen")
// instead of a system event, each with a thank-you link.

type Person = { id: string; name: string | null; image: string | null };

function Avatar({ name, image, size }: { name: string | null; image: string | null; size: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return image ? (
    <img src={toProxyUrl(image)} alt={name ?? ""} title={name ?? ""} className="shrink-0 rounded-full object-cover" style={style} />
  ) : (
    <span title={name ?? ""} className="flex shrink-0 items-center justify-center rounded-full bg-[#DCEAE0] font-bold text-[#24533A]" style={style}>
      {(name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
    </span>
  );
}

// The part of a translated message that comes before its {title}, e.g.
// "Ny idé: " from "Ny idé: {title}" — so the title can be lifted back out of
// a feed item's already-translated action, in any locale.
function prefixOf(template: string) {
  return template.split("\u0000")[0];
}

export default async function Community({
  locale, memberCount, newestMembers, events, isLoggedIn,
}: {
  locale: Locale; memberCount: number; newestMembers: Person[]; events: PulseItem[]; isLoggedIn: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "NewHomePage.community" });
  const tFeed = await getTranslations({ locale, namespace: "ActivityFeed" });
  const ideaPrefix = prefixOf(tFeed("newIdea", { title: "\u0000" }));
  const milestonePrefix = prefixOf(tFeed("milestoneCompleted", { title: "\u0000" }));
  const strip = (text: string, prefix: string) => (text.startsWith(prefix) ? text.slice(prefix.length) : text);

  const sentence = (a: PulseItem) => {
    if (a.targetType === "project") return t("startedProject", { project: a.projectName });
    if (a.targetType === "idea") return t("sharedIdea", { title: strip(a.action, ideaPrefix) });
    if (a.targetType === "milestone") return t("reachedMilestone", { project: a.projectName, title: strip(a.action, milestonePrefix) });
    return t("inProject", { action: a.action, project: a.projectName });
  };
  const dateFormat = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "long" });

  return (
    <section className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
      <SectionHeader
        eyebrow={t("eyebrow")}
        heading={t("peopleHeading", { count: memberCount })}
        link={{ href: "/members", label: t("meetAll") }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className={`${card} flex flex-col gap-5 p-6 sm:p-8`}>
          <p className={`${newHomeDisplayFont.className} m-0 text-xl font-bold`} style={{ color: INK }}>{t("wallTitle")}</p>
          <div className="flex flex-wrap gap-2.5">
            {newestMembers.map((u) => <Avatar key={u.id} name={u.name} image={u.image} size={44} />)}
          </div>
          <p className="m-0 text-[15px] leading-relaxed" style={{ color: MUTED }}>{t("wallBody")}</p>
          {!isLoggedIn && (
            <Link href={`/${locale}/login`} className="self-start rounded-full bg-[#E8531F] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#C2410C]">
              {t("join")}
            </Link>
          )}
        </div>
        <div className={`${card} flex flex-col p-2 sm:p-3`}>
          <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-2">
            <p className={`${newHomeDisplayFont.className} m-0 text-xl font-bold`} style={{ color: INK }}>{t("recentTitle")}</p>
            <Link href="/feed" className="text-xs font-semibold hover:underline" style={{ color: LINK }}>{t("seeAllLink")}</Link>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {events.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-2xl px-4 py-3 hover:bg-[#F6F6F3]">
                <Avatar name={a.avatarName} image={a.avatarImage} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[15px] leading-snug" style={{ color: INK }}>
                    <strong>{a.avatarName ?? t("someone")}</strong> <span style={{ color: MUTED }}>{sentence(a)}</span>
                  </p>
                  <p className="m-0 mt-0.5 text-xs" style={{ color: SUBTLE }}>{dateFormat.format(a.date)}</p>
                </div>
                <Link
                  href={a.href ?? "/feed"}
                  className="shrink-0 rounded-full border border-[#E4E4DF] bg-white px-3 py-1 text-[13px] font-semibold hover:border-[#E8531F]"
                  style={{ color: LINK }}
                >
                  ♥ {t("thank")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
