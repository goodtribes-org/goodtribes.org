"use client";

import { useTransition } from "react";
import { setSiteRole } from "./actions";
import type { SiteRole } from "@prisma/client";

export default function SiteRoleSelect({
  userId,
  initialRole,
}: {
  userId: string;
  initialRole: SiteRole;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={initialRole}
      disabled={isPending}
      onChange={(e) => startTransition(() => setSiteRole(userId, e.target.value as SiteRole))}
      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-dark-slate/70 focus:outline-none focus:border-seagrass disabled:opacity-50"
    >
      <option value="USER">Användare</option>
      <option value="ADMIN">Admin</option>
      <option value="OWNER">Ägare</option>
    </select>
  );
}
