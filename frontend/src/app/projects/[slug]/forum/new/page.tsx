import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewForumPostForm from "./NewForumPostForm";

export default async function NewForumPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <a
          href={`/projects/${slug}/forum`}
          className="text-sm text-dark-slate/50 hover:text-seagrass"
        >
          ← Tillbaka till forum
        </a>
        <h1 className="text-2xl font-bold mt-1">Nytt inlägg</h1>
      </div>
      <NewForumPostForm slug={slug} />
    </div>
  );
}
