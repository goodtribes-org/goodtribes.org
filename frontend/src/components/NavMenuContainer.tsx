"use client";

import { useSession, signOut } from "next-auth/react";
import NavMenu from "./NavMenu";

export default function NavMenuContainer() {
  const { data: session } = useSession();
  return <NavMenu session={session} onSignOut={() => signOut({ callbackUrl: "/" })} />;
}
