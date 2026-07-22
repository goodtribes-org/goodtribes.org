"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createProjectRecord } from "@/lib/createProject";

export async function createSandboxProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const problem = (formData.get("problem") as string | null)?.trim();
  if (!problem) return;
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;

  const title = problem.length > 80 ? `${problem.slice(0, 80)}…` : problem;

  const project = await createProjectRecord({
    title,
    description: problem,
    imageUrl,
    ownerId: session.user.id,
    isSandbox: true,
  });

  redirect(`/projects/${project.slug}/guide`);
}
