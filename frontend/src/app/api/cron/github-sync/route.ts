import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncAllProjectRepos } from "@/lib/githubSync";

export const dynamic = "force-dynamic";

// Called every 5 minutes by the goodtribes-github-sync CronJob (see
// chart/templates/github-sync-cronjob.yaml), which hits the in-cluster frontend
// Service directly.
//
// Unlike /api/cron/digest, a missing CRON_SECRET fails closed rather than
// skipping the auth check.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repos, results } = await syncAllProjectRepos();

  for (const result of results) {
    if (result.synced > 0 || result.removed > 0) {
      revalidatePath(`/projects/${result.projectSlug}`);
      revalidatePath(`/projects/${result.projectSlug}/tasks`);
      revalidatePath(`/projects/${result.projectSlug}/kanban`);
    }
  }

  return NextResponse.json({ ok: true, repos, results });
}
