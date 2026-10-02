import { redirect } from "next/navigation";

// Dashboard became the "Hitta ett projekt" tab in Mitt GoodTribes; old links
// (incl. the explore-by-skill filter) keep working.
export default async function DashboardRedirect({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const { skill } = await searchParams;
  redirect(`/my-goodtribes?tab=find${skill ? `&skill=${encodeURIComponent(skill)}` : ""}`);
}
