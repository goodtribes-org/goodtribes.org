// The start page's idea card, in the same frame as ProjectCard (white,
// seagrass border, small type) so the two rows read as one family: an "Idé"
// label, the title, up to three lines of description, who wrote it, and
// votes and comments along the bottom like ProjectCard's stats row.
export type HomeIdeaCardData = {
  id: string;
  title: string;
  description: string | null;
  authorName: string | null;
  votes: number;
  comments: number;
  // Projects driving the idea (#237); 0 = waiting for someone.
  drivenBy: number;
};

export type HomeIdeaCardLabels = {
  label: string;
  byAuthor: (name: string) => string;
  unknownAuthor: string;
  votes: string;
  comments: string;
  noDescription: string;
  drivenBy: (count: number) => string;
  waiting: string;
};

export default function IdeaCard({ idea, labels }: { idea: HomeIdeaCardData; labels: HomeIdeaCardLabels }) {
  return (
    <a
      href={`/ideas/${idea.id}`}
      className="flex w-full flex-col rounded-lg border border-seagrass bg-white p-3 transition-shadow hover:border-dark-slate hover:shadow-md"
    >
      <span className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-coral/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral">{labels.label}</span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${idea.drivenBy > 0 ? "bg-seagrass/10 text-seagrass" : "bg-amber-50 text-amber-700"}`}>
          {idea.drivenBy > 0 ? labels.drivenBy(idea.drivenBy) : labels.waiting}
        </span>
      </span>
      <p className="mb-0.5 text-sm font-bold leading-tight text-dark-slate">{idea.title}</p>
      <p className="mb-2 text-xs text-dark-slate/50">{labels.byAuthor(idea.authorName ?? labels.unknownAuthor)}</p>
      <p className="mb-2 line-clamp-3 flex-1 text-xs leading-snug text-dark-slate/70">
        {idea.description || labels.noDescription}
      </p>
      <div className="mt-auto grid grid-cols-2 divide-x divide-muted-teal/30 border-t border-muted-teal/20 pt-2 text-center">
        <div className="px-1">
          <p className="text-xs font-semibold text-dark-slate">{idea.votes}</p>
          <p className="text-[10px] leading-tight text-dark-slate/50">{labels.votes}</p>
        </div>
        <div className="px-1">
          <p className="text-xs font-semibold text-dark-slate">{idea.comments}</p>
          <p className="text-[10px] leading-tight text-dark-slate/50">{labels.comments}</p>
        </div>
      </div>
    </a>
  );
}
