import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewSandboxProjectForm from "./NewSandboxProjectForm";

export const metadata: Metadata = {
  title: "Nytt sandbox-projekt — GoodTribes.org",
};

export default async function NewSandboxProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-slate mb-1">Vilket problem vill du testa en idé på?</h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        Beskriv problemet i fritext — det blir ett riktigt (men experimentellt) projekt i Sandbox, som du
        senare kan göra om till ett vanligt projekt när det känns redo.
      </p>
      <NewSandboxProjectForm />
    </div>
  );
}
