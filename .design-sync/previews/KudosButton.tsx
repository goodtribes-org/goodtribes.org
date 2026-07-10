import { KudosButton } from "goodtribes-frontend";

export function Default() {
  return <KudosButton toUserId="user-42" toUserName="Elin Karlsson" projectId="project-7" />;
}

export function WithoutProject() {
  return <KudosButton toUserId="user-19" toUserName="Mattias Holm" />;
}
