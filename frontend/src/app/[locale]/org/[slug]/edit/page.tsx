export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation";
import EditOrgForm from "./EditOrgForm";


export default async function EditOrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [org, skills] = await Promise.all([
    prisma.organisation.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isPublic: true,
        ownerId: true,
        category: true,
        neededSkills: { select: { skillId: true } },
      },
    }),
    prisma.skill.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);

  if (!org || org.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">Edit organisation</h1>
      <p className="text-dark-slate/70 mb-8">Update the details for {org.name}.</p>

      <EditOrgForm
        orgId={org.id}
        orgName={org.name}
        orgSlug={org.slug}
        description={org.description ?? ""}
        imageUrl={org.imageUrl}
        isPublic={org.isPublic}
        category={org.category}
        skills={skills}
        currentSkillIds={org.neededSkills.map((s) => s.skillId)}
      />
    </div>
  );
}
