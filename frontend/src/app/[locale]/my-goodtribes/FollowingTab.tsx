import { getTranslations } from "next-intl/server";
import { getMyFollowing } from "@/lib/myGoodTribes";
import { PROJECT_PHASE_LABEL, toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { Panel, Empty, Row } from "./parts";

export default async function FollowingTab({ userId, locale }: { userId: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "MyGoodTribes" });
  const { projects, ideas, liked } = await getMyFollowing(userId);
  const phase = (p: string) => PROJECT_PHASE_LABEL[toDisplayPhase(p as ProjectPhaseValue)];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title={t("followedProjects", { count: projects.length })}>
        {projects.length === 0 ? <Empty>{t("followedProjectsEmpty")}</Empty> : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {projects.map((p) => <Row key={p.id} href={`/projects/${p.slug}`} title={p.title} meta={phase(p.phase)} />)}
          </ul>
        )}
      </Panel>
      <Panel title={t("followedIdeas", { count: ideas.length })}>
        {ideas.length === 0 ? <Empty>{t("followedIdeasEmpty")}</Empty> : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {ideas.map((i) => <Row key={i.id} href={`/ideas/${i.id}`} title={i.title} dot="#E8531F" />)}
          </ul>
        )}
      </Panel>
      <Panel title={t("likedProjects", { count: liked.length })}>
        {liked.length === 0 ? <Empty>{t("likedProjectsEmpty")}</Empty> : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {liked.map((p) => <Row key={p.id} href={`/projects/${p.slug}`} title={p.title} meta={phase(p.phase)} dot="#C62828" />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
