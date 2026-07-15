import { prisma } from "@/lib/prisma";
import { reviewContentFlag } from "./actions";
import { getTargetPreview, isContentTargetType } from "@/lib/contentModeration";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Trakasserier",
  OFFENSIVE: "Stötande",
  OFF_TOPIC: "Off-topic",
  OTHER: "Övrigt",
};

export default async function ContentFlagsAdminPage() {
  const flags = await prisma.contentFlag.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      flaggedBy: { select: { name: true, email: true } },
    },
  });

  const groups = new Map<string, typeof flags>();
  for (const flag of flags) {
    const key = `${flag.targetType}:${flag.targetId}`;
    const existing = groups.get(key);
    if (existing) existing.push(flag);
    else groups.set(key, [flag]);
  }

  const entries = await Promise.all(
    Array.from(groups.entries()).map(async ([key, groupFlags]) => {
      const [targetType, targetId] = [groupFlags[0].targetType, groupFlags[0].targetId];
      const preview = isContentTargetType(targetType) ? await getTargetPreview(targetType, targetId) : null;
      return { key, targetType, targetId, flags: groupFlags, preview };
    })
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Innehållsflaggor</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Hantera flaggat innehåll (inlägg, kommentarer, meddelanden). {entries.length} avvaktar granskning.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="border border-muted-teal/30 rounded-lg p-8 text-center text-dark-slate/50">
          Inget flaggat innehåll att granska.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map(({ key, targetType, targetId, flags: groupFlags, preview }) => (
            <div key={key} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-coral">{targetType}</span>
                  <p className="text-sm text-dark-slate mt-1 line-clamp-3">
                    {preview ?? <em className="text-dark-slate/40">Innehållet kunde inte hämtas.</em>}
                  </p>
                </div>
                <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  {groupFlags.length} {groupFlags.length === 1 ? "flagga" : "flaggor"}
                </span>
              </div>

              <ul className="text-xs text-dark-slate/60 mb-4 flex flex-col gap-1">
                {groupFlags.map((flag) => (
                  <li key={flag.id}>
                    <span className="font-medium text-dark-slate/80">{REASON_LABELS[flag.reason] ?? flag.reason}</span>
                    {flag.note ? `: ${flag.note}` : ""} — flaggad av{" "}
                    <span className="font-medium text-dark-slate/70">
                      {flag.flaggedBy.name ?? flag.flaggedBy.email}
                    </span>{" "}
                    · {flag.createdAt.toLocaleDateString("sv-SE")}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <form
                  action={async () => {
                    "use server";
                    await reviewContentFlag(targetType, targetId, "dismissed");
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
                  >
                    Avfärda
                  </button>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await reviewContentFlag(targetType, targetId, "actioned", "Innehållet har dolts av administratören.");
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Dölj innehåll
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
