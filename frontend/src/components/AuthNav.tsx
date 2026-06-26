"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AuthNav() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div className="hidden md:flex items-center gap-4">
        <Link href="/workplace" className="text-dark-slate/70 hover:text-seagrass text-sm">
          Workplace
        </Link>
        <Link href="/dashboard" className="text-dark-slate/70 hover:text-seagrass text-sm">
          Dashboard
        </Link>
        <Link href="/profile" className="text-dark-slate/70 hover:text-seagrass text-sm">
          Profile
        </Link>
        <Link href="/settings" className="text-dark-slate/70 hover:text-seagrass text-sm">
          Settings
        </Link>
        <Link
          href="/projects/new"
          className="bg-coral text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors whitespace-nowrap"
        >
          + New project
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
    <div className="hidden md:flex items-center gap-3">
      <Link href="/login" className="text-dark-slate/70 hover:text-seagrass text-sm whitespace-nowrap">
        Log in
      </Link>
      <Link
        href="/signup"
        className="bg-coral text-white text-sm font-semibold px-4 py-2 rounded hover:bg-watermelon transition-colors whitespace-nowrap"
      >
        Create account
      </Link>
    </div>
  );
}
