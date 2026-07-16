import { IdeaCard } from "goodtribes-frontend";

const onVote = () => {};

const baseIdea = {
  id: "i1",
  title: "Verktygsbibliotek i varje stadsdel",
  problem: "Vi köper verktyg som används några gånger och sedan samlar damm. Tänk om varje stadsdel hade ett delningsbibliotek?",
  description: null,
  status: "open",
  imageUrl: null,
  sdgGoals: [11, 12],
  author: { name: "Amir Haddad" },
  myVoteId: null,
  _count: { votes: 128, endorsements: 12, comments: 34 },
};

export function Default() {
  return <IdeaCard idea={baseIdea} isLoggedIn={true} onVote={onVote} />;
}

export function LoggedOut() {
  return <IdeaCard idea={baseIdea} isLoggedIn={false} onVote={onVote} />;
}

export function Voted() {
  return (
    <IdeaCard
      idea={{ ...baseIdea, myVoteId: "v1", status: "converted", title: "Mobil vattenrening för översvämmade områden" }}
      isLoggedIn={true}
      onVote={onVote}
    />
  );
}
