import { useTranslations } from "next-intl";
import { SdgIcon } from "@/components/SdgIcon";
import { sdgIconPath, SDG_COLORS } from "@/lib/sdg";
import { toProxyUrl } from "@/lib/storageUrl";
import { daysLeft } from "@/lib/challenges";
import { compactKr, type CallCardData } from "@/lib/fundingCalls/public";

// Utlysningar (#344): a call as a card, in the same shape as ProjectCard —
// a 4:3 picture (the admin's own, or the funder's name on a tint), how long
// it's open and who runs it on the picture, then the call, who can apply,
// how much and how many ideas so far.
export default function FundingCallCard({ call }: { call: CallCardData }) {
  const t = useTranslations("FundingCalls");
  const days = call.deadline ? daysLeft(call.deadline) : null;
  const urgent = days !== null && days <= 14;
  const tint = call.sdgGoals[0] ? SDG_COLORS[call.sdgGoals[0]] : "#43aa8b";
  // The card has room for one figure: the most you can get.
  const amount = call.amountMaxSek ? compactKr(call.amountMaxSek) : call.amountMinSek ? compactKr(call.amountMinSek) : null;
  const allWho = call.applicantTypes.map((a) => t(`applicant.${a}`));
  const who = allWho.length ? `${allWho[0]}${allWho.length > 1 ? ` +${allWho.length - 1}` : ""}` : null;

  return (
    <a
      href={`/utlysningar/${call.slug}`}
      className="flex w-full flex-col overflow-hidden rounded-lg border border-seagrass bg-white transition-shadow hover:border-dark-slate hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full">
        {call.imageUrl ? (
          <img src={toProxyUrl(call.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `color-mix(in oklab, ${tint} 18%, white)` }}>
            {call.sdgGoals[0] ? (
              <img src={sdgIconPath(call.sdgGoals[0])} alt="" width={72} height={72} className="rounded shadow-sm" />
            ) : (
              <span className="text-4xl" aria-hidden>💰</span>
            )}
          </div>
        )}
        <span className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-xs font-semibold ${urgent ? "bg-coral text-white" : "border border-muted-teal/40 bg-white/90 text-dark-slate"}`}>
          {call.rolling ? t("rolling") : `⏳ ${t("daysLeft", { days: days ?? 0 })}`}
        </span>
        <span className="absolute right-2 top-2 max-w-[60%] truncate rounded border border-muted-teal/40 bg-white/90 px-1.5 py-0.5 text-xs font-semibold text-dark-slate">
          {call.fundingSource.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="mb-1 text-sm font-bold leading-tight text-dark-slate">{call.title}</p>
        <p className="mb-2 line-clamp-3 flex-1 text-xs leading-snug text-dark-slate/70">{call.summary}</p>
        {call.sdgGoals.length > 1 && (
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {call.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </div>
        )}
        <div className="mt-auto grid grid-cols-3 divide-x divide-muted-teal/30 border-t border-muted-teal/20 pt-2 text-center">
          <div className="min-w-0 px-1">
            <p className="truncate text-xs font-semibold text-dark-slate" title={amount ?? undefined}>{amount ?? "–"}</p>
            <p className="truncate text-[10px] leading-tight text-dark-slate/50">{call.amountMaxSek ? t("atMost") : t("amount")}</p>
          </div>
          <div className="min-w-0 px-1">
            <p className="truncate text-xs font-semibold text-dark-slate" title={allWho.join(", ") || undefined}>{who ?? "–"}</p>
            <p className="truncate text-[10px] leading-tight text-dark-slate/50">{t("whoCanApply")}</p>
          </div>
          <div className="min-w-0 px-1">
            <p className="text-xs font-semibold text-dark-slate">{call._count.ideas}</p>
            <p className="truncate text-[10px] leading-tight text-dark-slate/50">{t("ideas")}</p>
          </div>
        </div>
      </div>
    </a>
  );
}
