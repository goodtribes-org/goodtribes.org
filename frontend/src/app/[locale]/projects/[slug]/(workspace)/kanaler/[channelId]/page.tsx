import { redirect } from "next/navigation";

// Legacy URL kept as a redirect for old bookmarks/links; UI links go straight to /messages now.
export default async function KanalerChannelRedirect({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  redirect(`/messages/${channelId}`);
}
