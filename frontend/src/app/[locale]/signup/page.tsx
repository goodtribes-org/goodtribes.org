import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const params = await searchParams;

  async function handleSignUp(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    await signIn("resend", {
      email,
      redirectTo: params.callbackUrl ?? "/",
    });
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-2">Create your account</h1>
      <p className="text-dark-slate/70 mb-8">
        Enter your email address and we will send you an activation link.
      </p>

      {params.error && (
        <div className="mb-6 p-3 bg-watermelon/10 border border-watermelon/40 rounded text-sm text-watermelon">
          Something went wrong. Please try again.
        </div>
      )}

      <form action={handleSignUp} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-1">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors"
        >
          Send activation link
        </button>
      </form>

      <p className="mt-6 text-sm text-dark-slate/60 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-coral hover:text-seagrass underline underline-offset-4">
          Log in →
        </Link>
      </p>
    </div>
  );
}
