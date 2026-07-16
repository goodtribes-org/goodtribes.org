import { ProjectCard } from "goodtribes-frontend";

const baseProject = {
  slug: "solceller",
  title: "Solceller till byskolor i Kenya",
  summary: "Vi installerar solpaneler på 12 skolor utanför Kisumu så att eleverna kan plugga efter mörkrets inbrott.",
  description: null,
  status: "PRODUCTION",
  imageUrl: null,
  sdgGoals: [7, 4, 13],
  commercial: false,
  likes: 34,
  owner: { name: "Amina Odhiambo" },
  members: [{ id: "1" }, { id: "2" }, { id: "3" }],
  _count: { kanbanCards: 48 },
};

export function Default() {
  return <ProjectCard project={baseProject} />;
}

export function Commercial() {
  return (
    <ProjectCard
      project={{
        ...baseProject,
        slug: "havsplast",
        title: "Havsplast blir skolmöbler",
        summary: "Insamlad plast från västkusten återvinns till bänkar och bord för skolor i hela Norden.",
        sdgGoals: [14, 12],
        commercial: true,
        likes: 27,
        owner: { name: "Jonas Lindqvist" },
      }}
    />
  );
}

export function IdeaStage() {
  return (
    <ProjectCard
      project={{
        ...baseProject,
        slug: "vatten",
        title: "Mobil vattenrening",
        summary: "Portabla reningsverk för översvämmade områden — snabbt rent vatten där det behövs mest.",
        status: "CONCEPT",
        sdgGoals: [6, 13],
        likes: 12,
        owner: { name: "Fatima Al-Rashid" },
        members: [{ id: "1" }],
        _count: { kanbanCards: 14 },
      }}
    />
  );
}
