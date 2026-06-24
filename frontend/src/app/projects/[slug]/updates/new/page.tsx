import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import NewBlogPostForm from "./NewBlogPostForm";

const prisma = new PrismaClient();

export default async function NewUpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { members: { where: { userId: session.user.id } } },
  });
  if (!project) redirect("/projects");

  const role = project.members[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) redirect(`/projects/${slug}/updates`);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Post an update</h1>
      <NewBlogPostForm slug={slug} />
    </div>
  );
}
