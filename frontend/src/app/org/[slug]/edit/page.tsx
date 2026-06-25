export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import EditOrgForm from "./EditOrgForm";

const prisma = new PrismaClient();

export default async function EditOrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      isPublic: true,
      ownerId: true,
    },
  });

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
      />
    </div>
  );
}
