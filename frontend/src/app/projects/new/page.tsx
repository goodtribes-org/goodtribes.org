import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewProjectForm from "./NewProjectForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Project — GoodTribes.org",
};

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">New project</h1>
      <p className="text-dark-slate/70 mb-8">Fill in the details for your project.</p>
      <NewProjectForm />
    </div>
  );
}
