import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const params = await searchParams;

  async function handleSignIn(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    await signIn("resend", {
      email,
      redirectTo: params.callbackUrl ?? "/",
    });
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-2">Logga in</h1>
      <p className="text-gray-600 mb-8">
        Ange din e-postadress så skickar vi en inloggningslänk.
      </p>

      {params.error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Något gick fel. Försök igen.
        </div>
      )}

      <form action={handleSignIn} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-postadress
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="din@epost.se"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gray-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Skicka inloggningslänk
        </button>
      </form>
    </div>
  );
}
