import { WorkspaceTabNav } from "goodtribes-frontend";

export function MessagesActive() {
  return <WorkspaceTabNav slug="goodtribes" isAdmin={false} pathname="/work/goodtribes/messages" />;
}

export function AdminActive() {
  return <WorkspaceTabNav slug="goodtribes" isAdmin={true} pathname="/work/goodtribes/admin" />;
}
