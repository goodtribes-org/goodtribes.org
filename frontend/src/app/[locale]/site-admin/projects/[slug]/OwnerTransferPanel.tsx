"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { searchAnyUser } from "./actions";
import { transferOwnership } from "@/app/[locale]/projects/[slug]/ownership-actions";

type UserResult = { id: string; name: string | null; image: string | null; email: string };

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate shrink-0 overflow-hidden relative">
      {image ? (
        <Image src={image} alt={name ?? ""} fill className="object-cover" unoptimized />
      ) : (
        initials
      )}
    </div>
  );
}

export default function OwnerTransferPanel({
  slug,
  currentOwner,
}: {
  slug: string;
  currentOwner: { id: string; name: string | null; email: string; image: string | null };
}) {
  const t = useTranslations("SiteAdminProjectDetail");
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [owner, setOwner] = useState(currentOwner);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const id = setTimeout(() => {
      searchAnyUser(q)
        .then((r) => { setResults(r); setSearched(true); })
        .catch(() => { setResults([]); setSearched(true); });
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  function handleTransfer(user: UserResult) {
    if (user.id === owner.id) return;
    if (!confirm(t("confirmTransfer", { name: user.name ?? t("genericPerson") }))) return;
    startTransition(async () => {
      const res = await transferOwnership(slug, user.id);
      if (!("error" in res)) {
        setOwner({ id: user.id, name: user.name, email: user.email, image: user.image });
        setQuery("");
        setResults([]);
        setSearched(false);
        setDone(true);
      }
    });
  }

  return (
    <div className="border border-muted-teal/30 rounded-xl p-4">
      <p className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">{t("currentOwnerHeading")}</p>
      <div className="flex items-center gap-2 mb-4">
        <Avatar name={owner.name} image={owner.image} />
        <span className="min-w-0">
          <span className="block text-sm text-dark-slate truncate">{owner.name ?? t("unknownName")}</span>
          <span className="block text-xs text-dark-slate/40 truncate">{owner.email}</span>
        </span>
      </div>

      <p className="text-xs font-semibold text-dark-slate/40 uppercase tracking-wide mb-2">{t("transferHeading")}</p>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setDone(false); }}
          placeholder={t("searchPlaceholder")}
          className="w-full text-sm border border-muted-teal/30 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-seagrass/40 placeholder:text-dark-slate/30"
        />
        {query.trim() && (
          <div className="mt-1 border border-muted-teal/30 rounded-xl bg-white shadow-sm divide-y divide-muted-teal/10 max-h-64 overflow-y-auto">
            {searched && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-dark-slate/40 italic">{t("noMatches")}</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={isPending || u.id === owner.id}
                onClick={() => handleTransfer(u)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dry-sage/20 transition-colors disabled:opacity-50"
              >
                <Avatar name={u.name} image={u.image} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-dark-slate truncate">{u.name ?? "?"}</span>
                  <span className="block text-xs text-dark-slate/40 truncate">{u.email}</span>
                </span>
                <span className="text-xs font-semibold text-seagrass shrink-0">
                  {u.id === owner.id ? t("alreadyOwnerLabel") : t("makeOwnerButton")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {done && <p className="text-xs text-seagrass mt-2">{t("transferredMessage")}</p>}
    </div>
  );
}
