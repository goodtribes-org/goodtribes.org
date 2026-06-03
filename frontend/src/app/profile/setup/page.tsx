import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { saveProfile } from "./actions";

export default async function ProfileSetupPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-2">Välkommen!</h1>
      <p className="text-dark-slate/70 mb-8">
        Berätta lite om dig själv för att komma igång.
      </p>

      <form action={saveProfile} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
            Namn
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ditt namn"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-dark-slate mb-1">
            Land
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            autoComplete="country-name"
            placeholder="Sverige"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors"
        >
          Spara och fortsätt
        </button>
      </form>
    </div>
  );
}
