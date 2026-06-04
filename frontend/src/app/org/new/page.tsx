import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createOrg } from "./actions";

export default async function NewOrgPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">Ny organisation</h1>
      <p className="text-dark-slate/70 mb-8">Fyll i uppgifterna för din organisation.</p>

      <form action={createOrg} className="flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
            Namn <span className="text-watermelon">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Organisationens namn"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
            Beskrivning
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Berätta om organisationen, vad ni gör och vad ni söker hjälp med..."
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-dark-slate mb-1">
            Logotyp-URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            placeholder="https://example.org/logo.png"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
          <p className="text-xs text-dark-slate/50 mt-1">
            Länk till en bild. Bilduppladdning läggs till senare.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            defaultChecked
            className="accent-seagrass w-4 h-4"
          />
          <label htmlFor="isPublic" className="text-sm text-dark-slate">
            Visa organisationen publikt
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
        >
          Skapa organisation
        </button>
      </form>
    </div>
  );
}
