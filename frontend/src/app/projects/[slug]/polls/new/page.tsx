import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewPollForm from "./NewPollForm";

export default async function NewPollPage({
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
          href={`/projects/${slug}/polls`}
          className="text-sm text-dark-slate/50 hover:text-seagrass"
        >
          ← Tillbaka till omröstningar
        </a>
        <h1 className="text-2xl font-bold mt-1">Ny omröstning</h1>
      </div>
      <NewPollForm slug={slug} />
    </div>
  );
}
