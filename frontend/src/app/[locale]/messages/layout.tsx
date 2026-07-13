export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDirectAndGroupRooms, getProjectChannelGroups, getOrgChannelGroups } from "@/lib/rooms";
import { MessagesSidebar } from "./MessagesSidebar";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [dmGroupRooms, projectGroups, orgGroups] = await Promise.all([
    getDirectAndGroupRooms(session.user.id),
    getProjectChannelGroups(session.user.id),
    getOrgChannelGroups(session.user.id),
  ]);

  return (
    <div className="flex gap-6 max-w-5xl mx-auto">
      <MessagesSidebar
        dmGroupRooms={dmGroupRooms.map((r) => ({ ...r, lastMessageAt: r.lastMessageAt.toISOString() }))}
        projectGroups={projectGroups}
        orgGroups={orgGroups}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
