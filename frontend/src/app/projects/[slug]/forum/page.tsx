import { redirect } from "next/navigation";

export default async function ForumRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/projects/${slug}/kanaler`);
}
