"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className="w-full bg-coral text-white font-semibold py-3 rounded-lg hover:bg-watermelon transition-colors"
    >
      Log out and sign in with the right account →
    </button>
  );
}
