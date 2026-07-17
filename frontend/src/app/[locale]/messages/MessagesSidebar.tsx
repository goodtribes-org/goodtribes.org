"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import PresenceDot from "@/components/PresenceDot";
import { useMessagesSection, type MessagesSection } from "./useMessagesSection";
import { NewMessageButton } from "./NewMessageButton";
import { getPublicProjectChannels } from "./actions";
import type { PublicProjectChannelGroup } from "@/lib/rooms";

type DmGroupRoom = {
  id: string;
  type: "DM" | "GROUP";
  name: string | null;
  otherUsers: { id: string; name: string | null; image: string | null }[];
  lastMessage: { body: string; authorId: string } | null;
  lastMessageAt: string;
  unread: boolean;
};

type RoomRow = { id: string; name: string | null };
type ProjectGroup = { id: string; slug: string; title: string; rooms: RoomRow[] };
type OrgGroup = { id: string; slug: string; name: string; rooms: RoomRow[] };

type Props = {
  isLoggedIn: boolean;
  dmGroupRooms: DmGroupRoom[];
  projectGroups: ProjectGroup[];
  orgGroups: OrgGroup[];
};

function initialsOf(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-muted-teal/20 py-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-dark-slate/50 uppercase tracking-widest"
      >
        {title}
        <span className="text-dark-slate/30">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

const TABS: { key: MessagesSection; labelKey: "unread" | "channelsTab" | "chatsTab" }[] = [
  { key: "unread", labelKey: "unread" },
  { key: "channels", labelKey: "channelsTab" },
  { key: "chat", labelKey: "chatsTab" },
];

function TabRow({ active }: { active: MessagesSection }) {
  const t = useTranslations("Messages");

  // Switching tabs always goes back to the messages index — staying on
  // the currently open room's URL would leave its conversation showing
  // in the main pane even though the sidebar now lists a different set
  // of rooms.
  function hrefFor(key: MessagesSection) {
    return `/messages?section=${key}`;
  }

  return (
    <div className="border-b border-muted-teal/20">
      <div className="flex items-center justify-end px-2 pt-2">
        <NewMessageButton />
      </div>
      <div className="flex items-center gap-1.5 px-2 pb-2 overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              active === tab.key ? "bg-coral text-white" : "text-dark-slate/60 border border-muted-teal/30 hover:bg-dry-sage/20"
            }`}
          >
            {t(tab.labelKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MessagesSidebar({ isLoggedIn, dmGroupRooms, projectGroups, orgGroups }: Props) {
  const t = useTranslations("Messages");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusProjectSlug = searchParams.get("project");
  const focusOrgSlug = searchParams.get("org");
  const section = useMessagesSection();
  const visibleDmGroupRooms = section === "unread" ? dmGroupRooms.filter((r) => r.unread) : dmGroupRooms;

  const isIndex = pathname === "/messages" || pathname.endsWith("/messages");
  const currentRoomId = pathname.match(/\/messages\/([^/?]+)/)?.[1] ?? null;

  function isActive(roomId: string) {
    return pathname.endsWith(`/messages/${roomId}`);
  }

  // Personal channel groups (getProjectChannelGroups) only include projects
  // the viewer is a member of — for a public project's channel reached via a
  // direct link (activity feed) or the "Kommunikation" tab, that list won't
  // include it even though the room itself is readable (see roomAuth.ts).
  // This looks the project up independently so it's still discoverable.
  const alreadyListed = focusProjectSlug
    ? projectGroups.some((p) => p.slug === focusProjectSlug)
    : currentRoomId
    ? projectGroups.some((p) => p.rooms.some((r) => r.id === currentRoomId))
    : true;

  const [publicChannelGroup, setPublicChannelGroup] = useState<PublicProjectChannelGroup | null>(null);

  useEffect(() => {
    if (alreadyListed) {
      setPublicChannelGroup(null);
      return;
    }
    let cancelled = false;
    const lookup = focusProjectSlug
      ? getPublicProjectChannels({ slug: focusProjectSlug })
      : currentRoomId
      ? getPublicProjectChannels({ roomId: currentRoomId })
      : Promise.resolve(null);
    lookup
      .then((group) => { if (!cancelled) setPublicChannelGroup(group); })
      .catch(() => { if (!cancelled) setPublicChannelGroup(null); });
    return () => { cancelled = true; };
  }, [alreadyListed, focusProjectSlug, currentRoomId]);

  return (
    <aside
      className={`${isIndex ? "flex" : "hidden md:flex"} flex-col w-full md:w-64 shrink-0 border-r border-muted-teal/20 max-h-[calc(100dvh-160px)] overflow-y-auto`}
    >
      {publicChannelGroup && (
        <Section title={publicChannelGroup.title} defaultOpen>
          {publicChannelGroup.rooms.map((room) => (
            <Link
              key={room.id}
              href={`/messages/${room.id}?project=${publicChannelGroup.slug}`}
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 my-0.5 rounded-md text-sm transition-colors ${
                isActive(room.id) ? "bg-dry-sage/40 text-dark-slate font-semibold" : "text-dark-slate/70 hover:bg-dry-sage/20"
              }`}
            >
              <span className="text-dark-slate/30 text-xs">#</span>
              <span className="flex-1 truncate">{room.name}</span>
            </Link>
          ))}
        </Section>
      )}

      {!isLoggedIn ? (
        <p className="text-sm text-dark-slate/50 p-4">
          <Link href="/login" className="text-coral hover:underline font-medium">
            Logga in
          </Link>{" "}
          för att se dina egna meddelanden och kanaler.
        </p>
      ) : (
        <>
      <TabRow active={section} />

      {(section === "chat" || section === "unread") && (
      <Section title={t("directMessages")}>
        {visibleDmGroupRooms.length === 0 && (
          <p className="px-3 py-2 text-xs text-dark-slate/40 italic">{t("empty")}</p>
        )}
        {visibleDmGroupRooms.map((room) => {
          const title = room.type === "GROUP" ? room.name ?? room.otherUsers.map((u) => u.name).join(", ") : room.otherUsers[0]?.name ?? "?";
          const other = room.otherUsers[0];
          return (
            <Link
              key={room.id}
              href={`/messages/${room.id}?section=chat`}
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 my-0.5 rounded-md text-sm transition-colors ${
                isActive(room.id) ? "bg-dry-sage/40 text-dark-slate font-semibold" : "text-dark-slate/70 hover:bg-dry-sage/20"
              }`}
            >
              <div className="relative w-6 h-6 rounded-full bg-dry-sage flex items-center justify-center text-[10px] font-semibold text-dark-slate shrink-0 overflow-hidden">
                {other?.image ? <Image src={other.image} fill className="object-cover" alt="" unoptimized /> : initialsOf(title)}
              </div>
              <span className="flex-1 truncate">{title}</span>
              {room.type === "DM" && other && <PresenceDot userId={other.id} />}
              {room.unread && <span className="w-1.5 h-1.5 rounded-full bg-seagrass shrink-0" />}
            </Link>
          );
        })}
      </Section>
      )}

      {section === "channels" && (
      <>
      {projectGroups.map((project) => (
        <Section key={project.id} title={project.title} defaultOpen={!focusProjectSlug || focusProjectSlug === project.slug}>
          {project.rooms.map((room) => (
            <Link
              key={room.id}
              href={`/messages/${room.id}?section=channels&project=${project.slug}`}
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 my-0.5 rounded-md text-sm transition-colors ${
                isActive(room.id) ? "bg-dry-sage/40 text-dark-slate font-semibold" : "text-dark-slate/70 hover:bg-dry-sage/20"
              }`}
            >
              <span className="text-dark-slate/30 text-xs">#</span>
              <span className="flex-1 truncate">{room.name}</span>
            </Link>
          ))}
        </Section>
      ))}

      {orgGroups.map((org) => (
        <Section key={org.id} title={org.name} defaultOpen={!focusOrgSlug || focusOrgSlug === org.slug}>
          {org.rooms.map((room) => (
            <Link
              key={room.id}
              href={`/messages/${room.id}?section=channels&org=${org.slug}`}
              className={`flex items-center gap-2 px-3 py-1.5 mx-1 my-0.5 rounded-md text-sm transition-colors ${
                isActive(room.id) ? "bg-dry-sage/40 text-dark-slate font-semibold" : "text-dark-slate/70 hover:bg-dry-sage/20"
              }`}
            >
              <span className="text-dark-slate/30 text-xs">#</span>
              <span className="flex-1 truncate">{room.name ?? "Arbetsrum"}</span>
            </Link>
          ))}
        </Section>
      ))}
      </>
      )}
        </>
      )}
    </aside>
  );
}
