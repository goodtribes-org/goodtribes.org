"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addRoleNeed, assignRoleNeed, deleteRoleNeed, updateRoleNeed } from "./actions";

type Role = { id: string; title: string; description: string | null; filledById: string | null; createdByAi: boolean };
type Member = { id: string; name: string };

function RoleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  pending,
}: {
  initial?: { title: string; description: string };
  submitLabel: string;
  onSubmit: (title: string, description: string) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  const t = useTranslations("UppstartOverview");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(title, description);
      }}
      className="flex flex-col gap-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("roleTitlePlaceholder")}
        aria-label={t("roleTitlePlaceholder")}
        className="rounded-md border border-muted-teal px-3 py-1.5 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("roleDescriptionPlaceholder")}
        aria-label={t("roleDescriptionPlaceholder")}
        rows={2}
        className="rounded-md border border-muted-teal px-3 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !title.trim()} className="rounded-lg bg-seagrass px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

// The core team as roles: who's needed, and who has taken each role.
// Vacant roles are what to invite people for (the invite box sits right
// below this on the page).
export default function RolesSection({
  slug,
  roles,
  members,
  canEdit,
}: {
  slug: string;
  roles: Role[];
  members: Member[];
  canEdit: boolean;
}) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;

  function act(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  const vacant = roles.filter((r) => !r.filledById).length;

  return (
    <div className="flex flex-col gap-3">
      {roles.length > 0 && (
        <p className="text-sm text-dark-slate/60">
          {vacant ? t("rolesVacant", { count: vacant, total: roles.length }) : t("rolesAllFilled")}
        </p>
      )}
      <ul className="grid gap-2 md:grid-cols-2">
        {roles.map((r) => (
          <li key={r.id} className="rounded-xl border border-muted-teal/30 p-3">
            {editing === r.id ? (
              <RoleForm
                initial={{ title: r.title, description: r.description ?? "" }}
                submitLabel={t("save")}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSubmit={(title, description) => act(() => updateRoleNeed(slug, r.id, title, description), () => setEditing(null))}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-dark-slate">
                    {r.title}
                    {r.createdByAi && <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-seagrass">{t("aiDraft")}</span>}
                  </p>
                  {canEdit && (
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button type="button" onClick={() => setEditing(r.id)} className="text-dark-slate/50 hover:text-coral">
                        {t("edit")}
                      </button>
                      {confirmDelete === r.id ? (
                        <>
                          <button type="button" onClick={() => act(() => deleteRoleNeed(slug, r.id), () => setConfirmDelete(null))} className="font-semibold text-watermelon">
                            {t("confirmDelete")}
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(null)} className="text-dark-slate/50">
                            {t("cancel")}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(r.id)} className="text-dark-slate/50 hover:text-watermelon">
                          {t("delete")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {r.description && <p className="mt-1 text-sm text-dark-slate/70">{r.description}</p>}
                <div className="mt-2 text-sm">
                  {canEdit ? (
                    <label className="flex items-center gap-2 text-dark-slate/60">
                      {t("filledBy")}
                      <select
                        value={r.filledById ?? ""}
                        disabled={pending}
                        onChange={(e) => act(() => assignRoleNeed(slug, r.id, e.target.value || null))}
                        className="rounded-md border border-muted-teal bg-white px-2 py-1 text-sm text-dark-slate"
                      >
                        <option value="">{t("vacant")}</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : r.filledById ? (
                    <span className="text-dark-slate/70">{nameOf(r.filledById)}</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{t("vacant")}</span>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {roles.length === 0 && <p className="text-sm text-dark-slate/50">{t("rolesEmpty")}</p>}
      {canEdit &&
        (adding ? (
          <div className="rounded-xl border border-dashed border-muted-teal/50 p-3">
            <RoleForm submitLabel={t("addRole")} pending={pending} onCancel={() => setAdding(false)} onSubmit={(title, description) => act(() => addRoleNeed(slug, title, description), () => setAdding(false))} />
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="self-start text-sm font-medium text-seagrass hover:underline">
            + {t("addRole")}
          </button>
        ))}
      {error && <p className="text-sm text-watermelon">{error}</p>}
    </div>
  );
}
