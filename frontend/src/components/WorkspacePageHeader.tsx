import type { ReactNode } from "react";
import HelpButton from "./HelpButton";

// Shared header for every project workspace subpage (Kalender, Wiki,
// Omröstningar, ...) — see the "Undersidestandarden" design proposal.
// No back-to-project link here: the slim ProjectMiniHero bar above every
// workspace subpage already names (and links to) the project, so repeating
// it here would just be the same fact twice.
export default function WorkspacePageHeader({
  title,
  description,
  help,
  helpMoreHref,
  helpMoreLabel,
  action,
}: {
  title: string;
  description?: string;
  help?: string;
  helpMoreHref?: string;
  helpMoreLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-dark-slate">{title}</h1>
          {help && <HelpButton text={help} moreHref={helpMoreHref} moreLabel={helpMoreLabel} />}
        </div>
        {description && <p className="mt-1 max-w-prose text-sm text-dark-slate/60">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
