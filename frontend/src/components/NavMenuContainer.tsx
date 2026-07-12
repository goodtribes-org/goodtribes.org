"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import NavMenu from "./NavMenu";

export default function NavMenuContainer() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("Nav");
  const tAccount = useTranslations("Account");
  return (
    <NavMenu
      session={session}
      onSignOut={() => signOut({ callbackUrl: "/" })}
      onNavigate={(href) => router.push(href)}
      t={t}
      tAccount={tAccount}
    />
  );
}
