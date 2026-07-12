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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Share an idea</h1>
        <p className="text-dark-slate/60 text-sm">
          Got an idea that could make an impact? Walk through the steps below — the more detail you provide, the more likely others will rally behind it.
        </p>
      </div>
      <NewIdeaForm />
    </div>
  );
}
