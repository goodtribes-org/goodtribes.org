import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewOrgForm from "./NewOrgForm";

export default async function NewOrgPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">Ny organisation</h1>
      <p className="text-dark-slate/70 mb-8">Fyll i uppgifterna för din organisation.</p>
      <NewOrgForm />
    </div>
  );
}
