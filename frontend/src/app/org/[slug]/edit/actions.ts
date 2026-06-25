"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";

const prisma = new PrismaClient();

export async function updateOrg(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = formData.get("orgId") as string;
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const isPublic = formData.get("isPublic") === "on";

  const existing = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { ownerId: true, name: true, slug: true },
  });
  if (!existing || existing.ownerId !== session.user.id) redirect("/org");

  let slug = existing.slug;
  if (name !== existing.name) {
    const baseSlug = slugify(name);
    for (let attempt = 0; attempt <= 4; attempt++) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      const conflict = await prisma.organisation.findUnique({ where: { slug: candidate } });
      if (!conflict || conflict.id === orgId) {
        slug = candidate;
        break;
      }
      if (attempt === 4) throw new Error("Kunde inte generera ett unikt slug");
    }
  }

  await prisma.organisation.update({
    where: { id: orgId },
    data: { name, slug, description, imageUrl, isPublic },
  });

  revalidatePath(`/org/${slug}`);
  revalidatePath("/org");
  redirect(`/org/${slug}`);
}

export async function deleteOrg(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = formData.get("orgId") as string;

  const existing = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  if (!existing || existing.ownerId !== session.user.id) redirect("/org");

  await prisma.organisation.delete({ where: { id: orgId } });

  redirect("/org");
}
