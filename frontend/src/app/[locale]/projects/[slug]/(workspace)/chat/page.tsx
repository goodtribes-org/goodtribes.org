import { redirect } from "next/navigation";

export default async function ChatRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/messages?project=${slug}`);
}
