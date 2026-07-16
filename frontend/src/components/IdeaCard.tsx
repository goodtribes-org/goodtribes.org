import { SdgIcon } from "@/components/SdgIcon";
import IdeaVoteButtonContainer from "@/components/IdeaVoteButtonContainer";

export type IdeaCardData = {
  id: string;
  title: string;
  problem: string | null;
  description: string | null;
  status: string;
  imageUrl: string | null;
  sdgGoals: number[];
  author: { name: string | null };
  myVoteId: string | null;
  _count: { votes: number; endorsements: number; comments: number };
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Utkast", cls: "bg-gray-100 text-gray-500" },
  open: { label: "Öppen", cls: "bg-teal-50 text-teal-700" },
  review: { label: "Granskas", cls: "bg-amber-100 text-amber-700" },
  shortlisted: { label: "Utvald", cls: "bg-purple-100 text-purple-700" },
  approved: { label: "Godkänd", cls: "bg-green-100 text-green-700" },
  converted: { label: "Blev projekt", cls: "bg-coral/10 text-coral" },
};

export default function IdeaCard({ idea, isLoggedIn }: { idea: IdeaCardData; isLoggedIn: boolean }) {
  const status = STATUS_LABELS[idea.status] ?? STATUS_LABELS.open;

  return (
    <a
      href={`/ideas/${idea.id}`}
      className="rounded-lg overflow-hidden border border-seagrass/40 hover:shadow-md transition-shadow bg-seagrass/5 flex flex-col"
    >
      <div className="px-3 pt-3 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.cls}`}>
          {status.label}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-seagrass">Idé</span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{idea.title}</p>
        <p className="text-xs text-dark-slate/50 mb-2">
          av <span className="text-coral">{idea.author.name ?? "Okänd"}</span>
        </p>
        <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">
          {idea.problem ?? idea.description ?? "Ingen beskrivning ännu."}
        </p>
        {idea.sdgGoals.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {idea.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-auto">
          <IdeaVoteButtonContainer
            ideaId={idea.id}
            voteCount={idea._count.votes}
            hasVoted={!!idea.myVoteId}
            isLoggedIn={isLoggedIn}
          />
          <span className="text-[11px] text-dark-slate/50">{idea._count.comments} kommentarer</span>
        </div>
      </div>
    </a>
  );
}
