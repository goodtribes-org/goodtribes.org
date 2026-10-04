import { redirect } from "next/navigation";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";

// The Idé step guide is now the Idé phase page itself, one step at a time
// (#206). Old links land there, on the same step when it still exists.
export default async function IdeaGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { slug } = await params;
  const { step } = await searchParams;
  const known = step && INITIATIVE_CHECKLIST_ITEMS.IDEA.some((i) => i.key === step);
  redirect(`/projects/${slug}/ide${known ? `?step=${step}` : ""}`);
}
