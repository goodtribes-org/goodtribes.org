import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { redirect } from "next/navigation";

export default async function KanbanRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  redirect(`/projects/${slug}/tasks`);
}
