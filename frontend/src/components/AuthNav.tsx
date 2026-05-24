"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function AuthNav() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div className="flex items-center gap-4 ml-auto">
        <Link href="/profile/setup" className="text-gray-600 hover:text-gray-900 text-sm">
          Min profil
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-gray-600 hover:text-gray-900 text-sm"
        >
          Logga ut
        </button>
      </div>
    );
  }

  return (
    <div className="ml-auto">
      <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm">
        Logga in
      </Link>
    </div>
  );
}
