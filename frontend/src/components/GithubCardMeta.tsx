"use client";

interface GithubCard {
  source?: string;
  githubNumber?: number | null;
  githubType?: string | null;
  githubUrl?: string | null;
  githubState?: string | null;
  githubMerged?: boolean;
  githubDraft?: boolean;
  githubLabels?: string[];
  githubAssignees?: string[];
}

export function isGithubCard(card: GithubCard): boolean {
  return card.source === "github";
}

function stateLabel(card: GithubCard): { text: string; className: string } {
  if (card.githubMerged) return { text: "merged", className: "bg-muted-teal/20 text-dark-slate" };
  if (card.githubState === "closed") return { text: "closed", className: "bg-dark-slate/10 text-dark-slate/60" };
  if (card.githubDraft) return { text: "draft", className: "bg-dry-sage/30 text-dark-slate/70" };
  return { text: "open", className: "bg-seagrass/20 text-seagrass" };
}

/**
 * Provenance strip for a card mirrored from GitHub: issue/PR number linking out,
 * state pill, labels and GitHub assignee logins.
 *
 * Everything here is read-only — GitHub is the source of truth for these cards.
 */
export default function GithubCardMeta({
  card,
  compact = false,
}: {
  card: GithubCard;
  compact?: boolean;
}) {
  if (!isGithubCard(card)) return null;

  const state = stateLabel(card);
  const labels = card.githubLabels ?? [];
  const assignees = card.githubAssignees ?? [];

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 mt-2"
      onClick={(e) => e.stopPropagation()}
    >
      {card.githubUrl && (
        <a
          href={card.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Öppna ${card.githubType === "pull_request" ? "pull request" : "issue"} på GitHub`}
          className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-dark-slate/5 text-dark-slate/70 hover:bg-dark-slate/10 hover:text-dark-slate transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          #{card.githubNumber}
        </a>
      )}

      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${state.className}`}>
        {state.text}
      </span>

      {!compact &&
        labels.slice(0, 3).map((label) => (
          <span
            key={label}
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-teal/15 text-dark-slate/70"
          >
            {label}
          </span>
        ))}

      {!compact && assignees.length > 0 && (
        <span className="text-[10px] text-dark-slate/50">@{assignees.join(", @")}</span>
      )}
    </div>
  );
}
