"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AuthNav() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div className="flex items-center gap-4 ml-auto">
        <Link href="/profile" className="text-dark-slate/70 hover:text-seagrass text-sm">
          My profile
        </Link>
        <Link href="/workplace" className="text-dark-slate/70 hover:text-seagrass text-sm">
          Workplace
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-dark-slate/70 hover:text-seagrass text-sm"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 ml-auto">
      <Link href="/login" className="text-dark-slate/70 hover:text-seagrass text-sm">
        Log in
      </Link>
      <Link
        href="/signup"
        className="bg-coral text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors"
      >
        Create account
      </Link>
    </div>
  );
}
