export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { getDirectAndGroupRooms, getProjectChannelGroups, getOrgChannelGroups } from "@/lib/rooms";
import { MessagesSidebar } from "./MessagesSidebar";

// No longer redirects logged-out visitors to /login: a shared link to a
// public project's channel (e.g. from the activity feed) should be openable
// without an account — the room page itself (getRoomAccess) decides whether
// the specific room is actually readable. The sidebar (your own DMs/channels)
// only makes sense once logged in, so it shows a login prompt instead.
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  const [dmGroupRooms, projectGroups, orgGroups] = userId
    ? await Promise.all([
        getDirectAndGroupRooms(userId),
        getProjectChannelGroups(userId),
        getOrgChannelGroups(userId),
      ])
    : [[], [], []];

  return (
    <div className="flex gap-6 max-w-5xl mx-auto">
      <MessagesSidebar
        isLoggedIn={!!userId}
        dmGroupRooms={dmGroupRooms.map((r) => ({ ...r, lastMessageAt: r.lastMessageAt.toISOString() }))}
        projectGroups={projectGroups}
        orgGroups={orgGroups}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
