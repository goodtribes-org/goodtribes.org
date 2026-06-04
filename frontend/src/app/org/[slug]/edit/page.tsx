import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { updateOrg, deleteOrg } from "./actions";

const prisma = new PrismaClient();

export default async function EditOrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const org = await prisma.organisation.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      isPublic: true,
      ownerId: true,
    },
  });

  if (!org || org.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-lg mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">Redigera organisation</h1>
      <p className="text-dark-slate/70 mb-8">Uppdatera uppgifterna för {org.name}.</p>

      <form action={updateOrg} className="flex flex-col gap-5">
        <input type="hidden" name="orgId" value={org.id} />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
            Namn <span className="text-watermelon">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={org.name}
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
            defaultValue={org.description ?? ""}
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
            defaultValue={org.imageUrl ?? ""}
            placeholder="https://example.org/logo.png"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            defaultChecked={org.isPublic}
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
          Spara ändringar
        </button>
      </form>

      <div className="mt-12 border-t border-muted-teal/40 pt-8">
        <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
          Farlig zon
        </h2>
        <p className="text-sm text-dark-slate/70 mb-4">
          Att ta bort organisationen är permanent och kan inte ångras.
        </p>
        <form action={deleteOrg}>
          <input type="hidden" name="orgId" value={org.id} />
          <button
            type="submit"
            className="border border-watermelon text-watermelon text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon hover:text-white transition-colors"
          >
            Ta bort organisation
          </button>
        </form>
      </div>
    </div>
  );
}
