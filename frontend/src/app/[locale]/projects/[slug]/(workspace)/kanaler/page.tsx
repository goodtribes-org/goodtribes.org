import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { redirect } from "next/navigation";

// Legacy URL kept as a redirect for old bookmarks/links; UI links go straight to /messages now.
export default async function KanalerRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  redirect(`/messages?project=${slug}`);
}
