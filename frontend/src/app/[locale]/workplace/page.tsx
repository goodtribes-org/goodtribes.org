import { redirect } from "next/navigation";

// Arbetsrum became Mitt GoodTribes (/my-goodtribes); old links — bookmarks,
// notifications sent before the move — keep working and land on the same tab.
export default async function WorkplaceRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab ? `/my-goodtribes?tab=${encodeURIComponent(tab)}` : "/my-goodtribes");
}
