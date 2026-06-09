import { redirect } from "next/navigation";

export default async function WorkspaceDefaultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/work/${slug}/messages`);
}
