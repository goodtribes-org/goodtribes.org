import { redirect } from "next/navigation";

export default async function KanalerChannelRedirect({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  redirect(`/messages/${channelId}`);
}
