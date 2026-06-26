export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import Link from "next/link";
import VotingForm from "./VotingForm";
import CloseButton from "./CloseButton";


function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  yes_no: "Ja/Nej-omröstning",
  multiple: "Flerval",
  ranked: "Rangordning",
};

function AvatarInitial({ name }: { name: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="w-7 h-7 rounded-full bg-seagrass/20 text-seagrass text-xs font-semibold flex items-center justify-center shrink-0">
      {initials}
    </span>
  );
}

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ slug: string; pollId: string }>;
}) {
  const { slug, pollId } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      title: true,
      ownerId: true,
      members: {
        where: { userId: userId ?? "__no_match__" },
        select: { role: true, userId: true },
      },
    },
  });
  if (!project) notFound();

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      createdBy: { select: { name: true } },
      options: {
        orderBy: { sortOrder: "asc" },
        include: {
          votes: { select: { userId: true, tokenWeight: true } },
        },
      },
      votes: {
        select: { userId: true, tokenWeight: true, pollOptionId: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!poll || poll.projectSlug !== slug) notFound();

  // Fetch voter names for the voter list
  const voterIds = [...new Set(poll.votes.map((v) => v.userId))];
  const voterUsers =
    voterIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: voterIds } },
          select: { id: true, name: true },
        })
      : [];
  const userNameMap = Object.fromEntries(voterUsers.map((u) => [u.id, u.name]));

  // Token balance for current user
  let userTotalTokens = 1;
  if (userId) {
    const aggregate = await prisma.tokenLedger.aggregate({
      where: { userId, projectSlug: slug },
      _sum: { tokens: true },
    });
    userTotalTokens = Math.max(aggregate._sum.tokens ?? 0, 1);
  }

  // Compute vote tallies per option
  const totalWeight = poll.votes.reduce((sum, v) => sum + v.tokenWeight, 0);
  const optionTallies = poll.options.map((opt) => {
    const optVotes = opt.votes;
    const weight = optVotes.reduce((sum, v) => sum + v.tokenWeight, 0);
    const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
    return { ...opt, weight, voterCount: optVotes.length, pct };
  });
  const uniqueVoters = new Set(poll.votes.map((v) => v.userId)).size;

  // Current user's existing votes
  const myVotes = poll.votes.filter((v) => v.userId === userId);
  const myExistingVotes = myVotes.map((v) => ({
    optionId: v.pollOptionId,
    weight: v.tokenWeight,
  }));
  const myVotedOptionIds = new Set(myVotes.map((v) => v.pollOptionId));

  // Show results if: live visibility, poll closed, or user already voted
  const showResults =
    poll.visibility === "live" || poll.status === "closed" || myVotes.length > 0;

  // Quorum calculation (percent of total project tokens that have voted)
  // We approximate participating tokens / total tokens here
  const quorumMet =
    poll.quorumPercent !== null && totalWeight > 0
      ? (uniqueVoters / Math.max(voterIds.length, 1)) * 100 >= poll.quorumPercent
      : false;

  // Permissions
  const isOwner = userId === project.ownerId;
  const memberRole = project.members[0]?.role;
  const isMember = !!project.members[0];
  const canClose =
    poll.status === "open" &&
    (isOwner || (memberRole && ["owner", "admin"].includes(memberRole)));

  const isPollOpen =
    poll.status === "open" && (!poll.deadline || new Date() < poll.deadline);
  const canVote = !!userId && isPollOpen;

  // Option label map for voter list
  const optionLabelMap = Object.fromEntries(poll.options.map((o) => [o.id, o.label]));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/projects/${slug}/polls`}
        className="inline-block text-sm text-dark-slate/50 hover:text-seagrass"
      >
        ← Omröstningar
      </Link>

      {/* Poll header card */}
      <div className="border border-muted-teal rounded-lg p-6">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {poll.status === "open" ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Öppen
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Avslutad
            </span>
          )}
          {poll.isBinding && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Bindande
            </span>
          )}
          <span className="text-xs text-dark-slate/40">
            {TYPE_LABELS[poll.type] ?? poll.type}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-dark-slate mb-2">{poll.title}</h1>

        {/* Description */}
        {poll.description && (
          <p className="text-sm text-dark-slate/70 leading-relaxed mb-3">{poll.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-dark-slate/40 flex-wrap">
          <span>Skapad av {poll.createdBy.name ?? "Okänd"}</span>
          <span>·</span>
          <span>{formatDate(poll.createdAt)}</span>
          {poll.deadline && (
            <>
              <span>·</span>
              <span>
                {isPollOpen ? "Stänger" : "Stängdes"}{" "}
                {formatDate(poll.deadline)}
              </span>
            </>
          )}
        </div>

        {/* Close button for owner/admin */}
        {canClose && (
          <div className="mt-4 pt-4 border-t border-muted-teal flex justify-end">
            <CloseButton pollId={pollId} projectSlug={slug} />
          </div>
        )}
      </div>

      {/* Results section */}
      {showResults && (
        <div className="border border-muted-teal rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-dark-slate/[0.03] border-b border-muted-teal flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-dark-slate">
              {uniqueVoters} deltagare · {totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(1)} tokens totalt
            </span>
            {poll.quorumPercent !== null && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  quorumMet
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                Kvorum: {uniqueVoters > 0 ? Math.round((uniqueVoters / Math.max(voterIds.length, 1)) * 100) : 0}% av {poll.quorumPercent}% krävs
              </span>
            )}
          </div>

          {/* Options */}
          <div className="divide-y divide-muted-teal/50">
            {optionTallies.map((opt) => {
              const isMyVote = myVotedOptionIds.has(opt.id);
              return (
                <div key={opt.id} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {isMyVote && (
                        <span className="shrink-0 text-coral text-sm font-bold" title="Din röst">
                          ✓
                        </span>
                      )}
                      <span className="text-sm font-medium text-dark-slate truncate">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="text-xs text-dark-slate/50 truncate hidden sm:block">
                          — {opt.description}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-dark-slate/70 shrink-0 ml-3">
                      {opt.pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2.5 bg-muted-teal/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-seagrass rounded-full transition-all duration-500"
                      style={{ width: `${opt.pct}%` }}
                    />
                  </div>

                  <p className="text-xs text-dark-slate/40 mt-1">
                    {opt.weight % 1 === 0 ? opt.weight : opt.weight.toFixed(1)} tokens
                    {" · "}
                    {opt.voterCount} röst{opt.voterCount !== 1 ? "er" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voting section */}
      {canVote && (
        <VotingForm
          pollId={pollId}
          projectSlug={slug}
          pollType={poll.type}
          options={poll.options.map((o) => ({
            id: o.id,
            label: o.label,
            description: o.description ?? null,
          }))}
          userTotalTokens={userTotalTokens}
          existingVotes={myExistingVotes}
        />
      )}

      {/* Login prompt */}
      {!session && isPollOpen && (
        <div className="border border-dashed border-muted-teal rounded-lg p-6 text-center">
          <p className="text-sm text-dark-slate/60">
            <Link href="/login" className="text-seagrass hover:underline">
              Logga in
            </Link>{" "}
            för att rösta.
          </p>
        </div>
      )}

      {/* Closed notice */}
      {poll.status === "closed" && !showResults && (
        <p className="text-sm text-dark-slate/40 text-center">Omröstningen är avslutad.</p>
      )}

      {/* Voter list — visible to members */}
      {isMember && poll.votes.length > 0 && (
        <div className="border border-muted-teal rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-dark-slate/[0.03] border-b border-muted-teal">
            <h2 className="text-sm font-semibold text-dark-slate">
              Röster ({poll.votes.length})
            </h2>
          </div>

          <div className="divide-y divide-muted-teal/50">
            {poll.votes.map((vote) => {
              const name = userNameMap[vote.userId] ?? "Okänd";
              const optionLabel = optionLabelMap[vote.pollOptionId] ?? "–";
              const w = vote.tokenWeight;
              return (
                <div
                  key={`${vote.userId}-${vote.pollOptionId}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <AvatarInitial name={name} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-dark-slate truncate block">
                      {name}
                    </span>
                    <span className="text-xs text-dark-slate/50">{optionLabel}</span>
                  </div>
                  <span className="text-xs text-dark-slate/50 shrink-0">
                    {w % 1 === 0 ? w : w.toFixed(1)} tokens
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
