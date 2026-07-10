import Link from "next/link";
import Image from "next/image";
import { SdgIcon } from "@/components/SdgIcon";

export type IdeaCardData = {
  id: string;
  title: string;
  problem: string | null;
  description: string | null;
  status: string;
  imageUrl: string | null;
  sdgGoals: number[];
  author: { name: string | null };
  _count: { votes: number; endorsements: number; comments: number };
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-gray-100 text-gray-500" },
  open: { label: "Open", cls: "bg-teal-50 text-teal-700" },
  review: { label: "Under Review", cls: "bg-amber-100 text-amber-700" },
  shortlisted: { label: "Shortlisted", cls: "bg-purple-100 text-purple-700" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700" },
  converted: { label: "Converted", cls: "bg-coral/10 text-coral" },
};

export default function IdeaCard({ idea }: { idea: IdeaCardData }) {
  const status = STATUS_LABELS[idea.status] ?? STATUS_LABELS.open;

  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
    >
      <div className="relative aspect-[4/3] w-full">
        {idea.imageUrl ? (
          <Image
            src={idea.imageUrl}
            alt={idea.title}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-dry-sage to-muted-teal/40 flex items-center justify-center p-4">
            <p className="text-xs font-semibold text-dark-slate/70 text-center leading-tight line-clamp-3">{idea.title}</p>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.cls}`}>
          {status.label}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{idea.title}</p>
        <p className="text-xs text-dark-slate/50 mb-2">
          by <span className="text-coral">{idea.author.name ?? "Unknown"}</span>
        </p>
        <p className="text-xs text-dark-slate/70 leading-snug mb-2 line-clamp-3 flex-1">
          {idea.problem ?? idea.description ?? "Ingen beskrivning ännu."}
        </p>
        {idea.sdgGoals.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="text-[11px] font-bold text-dark-slate/40 mr-0.5">Agenda 2030:</span>
            {idea.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{idea._count.votes}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Votes</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{idea._count.endorsements}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Contributors</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{idea._count.comments}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Comments</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
