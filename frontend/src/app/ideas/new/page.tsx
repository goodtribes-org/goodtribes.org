import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewIdeaForm from "./NewIdeaForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Idea — GoodTribes.org",
};

export default async function NewIdeaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">Share an idea</h1>
      <p className="text-dark-slate/70 mb-8">
        Got an idea that could make an impact? Share it with the community.
      </p>
      <NewIdeaForm />
    </div>
  );
}
