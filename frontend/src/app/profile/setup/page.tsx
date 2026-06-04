import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { saveProfile } from "./actions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function ProfileSetupPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { name: true, bio: true, socialLinks: true },
  });

  const social = (user?.socialLinks ?? {}) as Record<string, string>;

  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-dry-sage flex items-center justify-center text-4xl text-dark-slate/30 mb-3">
          👤
        </div>
        <p className="text-xs text-muted-teal">Profilbild — kan läggas till senare</p>
      </div>

      <h1 className="text-2xl font-bold mb-1">
        {session.user?.onboarded ? "Redigera profil" : "Välkommen!"}
      </h1>
      <p className="text-dark-slate/70 mb-8">
        {session.user?.onboarded
          ? "Uppdatera dina uppgifter nedan."
          : "Berätta lite om dig själv för att komma igång."}
      </p>

      <form action={saveProfile} className="flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
            Namn <span className="text-watermelon">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            defaultValue={user?.name ?? ""}
            placeholder="Ditt namn"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-dark-slate mb-1">
            Beskrivning
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={user?.bio ?? ""}
            placeholder="Berätta lite om dig själv, vad du kan bidra med..."
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
          />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-dark-slate mb-1">Sociala medier</legend>

          <div>
            <label htmlFor="website" className="block text-xs text-dark-slate/60 mb-1">Webbplats</label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={social.website ?? ""}
              placeholder="https://dinhemsida.se"
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="linkedin" className="block text-xs text-dark-slate/60 mb-1">LinkedIn</label>
            <input
              id="linkedin"
              name="linkedin"
              type="text"
              defaultValue={social.linkedin ?? ""}
              placeholder="linkedin.com/in/dittnamn"
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="github" className="block text-xs text-dark-slate/60 mb-1">GitHub</label>
            <input
              id="github"
              name="github"
              type="text"
              defaultValue={social.github ?? ""}
              placeholder="github.com/dittnamn"
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="twitter" className="block text-xs text-dark-slate/60 mb-1">Twitter / X</label>
            <input
              id="twitter"
              name="twitter"
              type="text"
              defaultValue={social.twitter ?? ""}
              placeholder="@dittnamn"
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
        >
          {session.user?.onboarded ? "Spara ändringar" : "Spara och fortsätt"}
        </button>
      </form>
    </div>
  );
}
