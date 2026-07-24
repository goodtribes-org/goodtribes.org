"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await signIn("resend", { email, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setError(true);
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="p-4 bg-seagrass/10 border border-seagrass/40 rounded-md">
        <p className="text-sm text-dark-slate">
          We&apos;ve sent a login link to <span className="font-semibold">{sentTo}</span>. Click it to sign in.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-3 text-sm text-coral hover:text-watermelon underline underline-offset-4"
        >
          Wrong address? Try again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-watermelon/10 border border-watermelon/40 rounded text-sm text-watermelon">
          Something went wrong. Please try again.
        </div>
      )}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send login link"}
      </button>
    </form>
  );
}
