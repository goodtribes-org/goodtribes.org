"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { indexDocuments } from "@/lib/meili";


export async function createOrg(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() || null;
  const isPublic = formData.get("isPublic") === "on";

  if (!name) return;

  const baseSlug = slugify(name);
  let slug = "";

  for (let attempt = 0; attempt <= 4; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
    try {
      const org = await prisma.organisation.create({
        data: { name, slug: candidate, description, imageUrl, isPublic, ownerId: userId },
      });
      await prisma.organisationMember.create({
        data: { organisationId: org.id, userId, role: "OWNER" },
      });
      slug = org.slug;
      if (isPublic) {
        await indexDocuments("orgs", [{
          id: `org-${org.slug}`,
          type: "org",
          title: org.name,
          description: org.description ?? "",
          url: `/org/${org.slug}`,
        }]);
      }
      break;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }

  redirect(`/org/${slug}`);
}
