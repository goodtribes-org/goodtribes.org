import Link from "next/link";
import Image from "next/image";
import { timeAgo } from "@/lib/timeAgo";
import FeedItemActions from "@/components/FeedItemActions";
import type { PulseItem } from "@/lib/activityFeed";

type Comment = { id: string; author: string; body: string; timeAgo: string };

export default function ActivityPulseItem({
  item,
  isLoggedIn,
  canJoin,
  initialLikeCount,
  initialLiked,
  initialComments,
}: {
  item: PulseItem;
  isLoggedIn: boolean;
  canJoin: boolean;
  initialLikeCount: number;
  initialLiked: boolean;
  initialComments: Comment[];
}) {
  const initials = item.avatarName
    ? item.avatarName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const iconImage = item.avatarImage || item.projectImage;

  return (
    <div className="rounded-xl border border-muted-teal/40 bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden relative shrink-0">
          {iconImage ? (
            <Image src={iconImage} alt={item.avatarName ?? ""} fill className="object-cover" unoptimized />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* Row 1 — project name links to the project, action links to the actual thing + join link */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs truncate min-w-0">
              {item.projectHref ? (
                <Link href={item.projectHref} className="font-semibold text-dark-slate hover:underline">
                  {item.projectName}
                </Link>
              ) : (
                <span className="font-semibold text-dark-slate/60">{item.projectName}</span>
              )}
              {" - "}
              {item.href ? (
                <Link href={item.href} className="font-normal text-dark-slate/70 hover:underline">
                  {item.action}
                </Link>
              ) : (
                <span className="font-normal text-dark-slate/70">{item.action}</span>
              )}
            </p>
            {canJoin && item.projectHref && (
              <Link href={item.projectHref} className="text-xs text-seagrass hover:underline shrink-0">
                Gå med →
              </Link>
            )}
          </div>
          {/* Row 2 — author name + date */}
          <p className="text-[11px] text-dark-slate/70">
            {item.avatarName ?? "Någon"} <span className="text-dark-slate/40">· {timeAgo(item.date)}</span>
          </p>
        </div>
      </div>
      {/* Row 3 — actual content preview, full width below icon */}
      {item.body && (
        <div className="mt-1.5">
          <p className="text-xs text-dark-slate/80 leading-snug line-clamp-3">{item.body}</p>
        </div>
      )}
      {item.subtasks && item.subtasks.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {item.subtasks.map((s, i) => (
            <li key={i} className="text-xs text-dark-slate/80 leading-snug flex items-center gap-1.5">
              <span>{s.done ? "☑" : "☐"}</span>
              <span className={s.done ? "line-through text-dark-slate/50" : ""}>{s.title}</span>
            </li>
          ))}
        </ul>
      )}
      {item.imageUrl && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden mt-2">
          <Image src={item.imageUrl} alt="" fill unoptimized className="object-cover" />
        </div>
      )}
      <FeedItemActions
        targetType={item.targetType}
        targetId={item.targetId}
        isLoggedIn={isLoggedIn}
        initialLikeCount={initialLikeCount}
        initialLiked={initialLiked}
        initialComments={initialComments}
      />
    </div>
  );
}
