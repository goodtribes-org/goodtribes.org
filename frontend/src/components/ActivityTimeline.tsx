export type ActivityEventItem = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  user: { name: string | null };
};

export type EventMeta = Record<
  string,
  { icon: string; label: (payload: Record<string, unknown>, actor: string) => string }
>;

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function ActivityTimeline({
  events,
  eventMeta,
  emptyLabel = "No activity yet.",
}: {
  events: ActivityEventItem[];
  eventMeta: EventMeta;
  emptyLabel?: string;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-dark-slate/40 py-8 text-center">{emptyLabel}</p>;
  }

  return (
    <ol className="relative border-l border-muted-teal/30 ml-3 space-y-0">
      {events.map((event) => {
        const meta = eventMeta[event.type];
        const actor = event.user.name ?? "Someone";
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const label = meta?.label(payload, actor) ?? `${actor} did something`;
        const icon = meta?.icon ?? "🔔";
        return (
          <li key={event.id} className="mb-6 ml-5">
            <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-muted-teal/40 text-sm">
              {icon}
            </span>
            <p className="text-sm text-dark-slate leading-snug">{label}</p>
            <time className="text-xs text-dark-slate/40">{timeAgo(event.createdAt)}</time>
          </li>
        );
      })}
    </ol>
  );
}
