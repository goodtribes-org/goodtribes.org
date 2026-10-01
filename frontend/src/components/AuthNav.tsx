"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toProxyUrl } from "@/lib/storageUrl";
import { ACCOUNT_NAV_ITEMS } from "@/lib/accountNav";

export default function AuthNav() {
  const { data: session } = useSession();
  const t = useTranslations("Nav");
  const tAccount = useTranslations("Account");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (session?.user) {
    const name = session.user.name ?? session.user.email ?? "?";
    const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

    return (
      <div ref={ref} className="hidden md:block relative shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          title={name}
          data-tour="nav-account"
          className="block"
        >
          <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden relative ring-2 ring-transparent hover:ring-seagrass transition-all">
            {session.user.image ? (
              <Image src={toProxyUrl(session.user.image)} alt={name} fill className="object-cover" unoptimized />
            ) : (
              initials
            )}
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-dark-slate truncate">{name}</p>
            </div>
            {ACCOUNT_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-dark-slate/70 hover:bg-dry-sage/30 hover:text-seagrass"
              >
                {tAccount(item.labelKey)}
              </Link>
            ))}
            {session.user.siteRole !== "USER" && (
              <Link
                href="/site-admin"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-dark-slate/70 hover:bg-dry-sage/30 hover:text-seagrass"
              >
                {tAccount("admin")}
              </Link>
            )}
            <div className="border-t border-gray-100 mt-1">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full text-left px-4 py-2 text-sm text-dark-slate/70 hover:bg-dry-sage/30 hover:text-seagrass"
              >
                {t("logOut")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    // A clear button, on every screen size: it's the only way to sign in
    // now that the ☰ menu no longer has a "Logga in" row.
    <div className="flex items-center">
      <Link
        href="/login"
        className="whitespace-nowrap rounded-full bg-coral px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-watermelon focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 sm:px-4"
      >
        {t("signIn")}
      </Link>
    </div>
  );
}
