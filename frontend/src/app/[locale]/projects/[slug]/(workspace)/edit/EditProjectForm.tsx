"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { updateProject, advanceProjectPhase, requestSandboxGraduation, toggleChecklistItem, updateGithubColumnMap } from "./actions";
import { COLUMNS, COLUMN_LABEL_KEYS } from "@/lib/kanbanColumns";
import { columnForStatus } from "@/lib/githubColumnMap";
import { markProjectAbandoned, unmarkProjectAbandoned, transferOwnership } from "@/app/[locale]/projects/[slug]/ownership-actions";
import { getSdgSuggestions } from "@/app/[locale]/projects/new/actions";
import FileUpload from "@/components/FileUpload";
import RichTextEditor from "@/components/RichTextEditor";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_EN } from "@/lib/sdg";
import { getNextPhase, isValidProjectPhase, getChecklistForPhase, type ProjectPhaseValue } from "@/lib/projectPhase";
import { CATEGORIES } from "@/lib/categories";

interface Props {
  slug: string;
  skills: { id: string; name: string; slug: string }[];
  orgs: { id: string; name: string }[];
  currentSkillIds: string[];
  currentOrgId: string | null;
  github: {
    projectInput: string;
    projectTitle: string | null;
    statusOptions: { id: string; name: string }[];
    columnMap: Record<string, string>;
    lastSyncedAt: string | null;
    lastSyncError: string | null;
  } | null;
  initial: {
    title: string;
    summary: string | null;
    description: string | null;
    phase: string;
    isSandbox: boolean;
    abandonedAt: string | null;
    category: string | null;
    tags: string[];
    sdgGoals: number[];
    imageUrl: string | null;
  };
  completedChecklistKeys: string[];
  ownershipInterests: { id: string; user: { id: string; name: string | null; image: string | null }; message: string | null; createdAt: string }[];
  graduationRequest: { status: string; decisionNote: string | null } | null;
}

export default function EditProjectForm({ slug, skills, orgs, currentSkillIds, currentOrgId, github, initial, completedChecklistKeys, ownershipInterests, graduationRequest }: Props) {
  const t = useTranslations("EditProjectForm");
  const tPhase = useTranslations("ProjectPhase");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const tKanban = useTranslations("KanbanShared");
  const [description, setDescription] = useState(initial.description ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(initial.sdgGoals));
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const [isAdvancing, startAdvancing] = useTransition();
  const [isGraduating, startGraduating] = useTransition();
  const [isAbandoning, startAbandoning] = useTransition();
  const [isTransferring, startTransferring] = useTransition();
  const [abandonedAt, setAbandonedAt] = useState(initial.abandonedAt);
  const [isTogglingChecklist, startTogglingChecklist] = useTransition();
  const [isMappingPending, startMappingTransition] = useTransition();
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedChecklistKeys));
  const imageInputRef = useRef<HTMLInputElement>(null);
  const nextPhase = isValidProjectPhase(initial.phase) ? getNextPhase(initial.phase) : null;
  const checklist = isValidProjectPhase(initial.phase) ? getChecklistForPhase(initial.phase) : null;

  function handleToggleChecklistItem(itemKey: string, done: boolean) {
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTogglingChecklist(() => toggleChecklistItem(slug, initial.phase as ProjectPhaseValue, itemKey, done));
  }

  function handleImageUpload(url: string) {
    if (imageInputRef.current) imageInputRef.current.value = url;
  }

  function toggle(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function handleSuggest() {
    startSuggesting(async () => {
      const result = await getSdgSuggestions(description);
      if (result) {
        setAiSuggested(result.goals);
        setReasoning(result.reasoning);
        setSelected(new Set(result.goals));
      }
    });
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateProject(slug, formData);
    });
  }

  return (
    <>
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* Organisation */}
      {orgs.length > 0 && (
        <div>
          <label htmlFor="orgId" className="block text-sm font-medium text-dark-slate mb-1">
            {t("orgLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalSuffix")}</span>
          </label>
          <select
            id="orgId"
            name="orgId"
            defaultValue={currentOrgId ?? ""}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="">{t("noneOption")}</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          {t("coverImageLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalSuffix")}</span>
        </label>
        <FileUpload
          visibility="public"
          accept="image/*"
          currentImageUrl={initial.imageUrl ?? undefined}
          onUpload={handleImageUpload}
        />
        <input type="hidden" name="imageUrl" ref={imageInputRef} defaultValue={initial.imageUrl ?? ""} />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          {t("titleLabel")} <span className="text-watermelon">*</span>
        </label>
        <input
          id="title" name="title" type="text" required
          defaultValue={initial.title}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>

      <div>
        <label htmlFor="githubProject" className="block text-sm font-medium text-dark-slate mb-1">
          {t("githubProjectLabel")} <span className="text-dark-slate/50 font-normal">{t("githubProjectHint")}</span>
        </label>
        <input
          id="githubProject"
          name="githubProject"
          type="text"
          placeholder="https://github.com/orgs/goodtribes-org/projects/2"
          defaultValue={github?.projectInput ?? ""}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
        {github?.lastSyncError ? (
          <p className="text-xs text-watermelon mt-1">{t("githubSyncFailed", { error: github.lastSyncError })}</p>
        ) : github?.lastSyncedAt ? (
          <p className="text-xs text-dark-slate/50 mt-1">
            {github.projectTitle ? `${github.projectTitle} · ` : ""}
            {t("githubLastSynced", { date: new Date(github.lastSyncedAt).toLocaleString("sv-SE") })}
          </p>
        ) : (
          <p className="text-xs text-dark-slate/50 mt-1">
            {t("githubSyncHelp")}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
          {t("summaryLabel")} <span className="text-dark-slate/50 font-normal">{t("summaryHint")}</span>
        </label>
        <textarea
          id="summary" name="summary" rows={2}
          defaultValue={initial.summary ?? ""}
          placeholder={t("summaryPlaceholder")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          {t("descriptionLabel")}
        </label>
        <input type="hidden" name="description" value={description} />
        <RichTextEditor content={description} onChange={setDescription} />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
          {t("categoryLabel")}
        </label>
        <select
          id="category" name="category"
          defaultValue={initial.category ?? ""}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
        >
          <option value="">{t("noneOption")}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Fas — fasövergångar sker bara framåt, ett steg i taget (PRD 4d) */}
      <div className="border border-muted-teal rounded-md p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-dark-slate">{t("phaseLabel")}</p>
          <p className="text-sm text-dark-slate/70 mt-0.5">{tPhase(initial.phase)}</p>
        </div>
        {nextPhase ? (
          <button
            type="button"
            disabled={isAdvancing}
            onClick={() => startAdvancing(() => advanceProjectPhase(slug))}
            className="text-sm font-medium text-seagrass border border-seagrass rounded-md px-4 py-2 hover:bg-seagrass/10 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {isAdvancing ? t("advancingButton") : t("advanceToPhaseButton", { phase: tPhase(nextPhase) })}
          </button>
        ) : (
          <span className="text-xs text-dark-slate/40 flex-shrink-0">{t("finalPhaseReached")}</span>
        )}
      </div>

      {initial.isSandbox && (
        <div className="border-2 border-amber-300 bg-amber-50/40 rounded-md p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-dark-slate">{t("sandboxHeading")}</p>
            {graduationRequest?.status === "pending" ? (
              <p className="text-xs text-dark-slate/60 mt-0.5">{t("graduationPending")}</p>
            ) : graduationRequest?.status === "rejected" ? (
              <p className="text-xs text-dark-slate/60 mt-0.5">
                {graduationRequest.decisionNote
                  ? t("graduationRejectedWithNote", { note: graduationRequest.decisionNote })
                  : t("graduationRejectedPlain")}
              </p>
            ) : (
              <p className="text-xs text-dark-slate/60 mt-0.5">{t("graduationPrompt")}</p>
            )}
          </div>
          {graduationRequest?.status !== "pending" && (
            <button
              type="button"
              disabled={isGraduating}
              onClick={() => startGraduating(() => requestSandboxGraduation(slug))}
              className="text-sm font-medium text-amber-700 border border-amber-400 rounded-md px-4 py-2 hover:bg-amber-100 transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {isGraduating ? t("graduatingButton") : t("applyGraduationButton")}
            </button>
          )}
        </div>
      )}

      <div className="border-2 border-amber-300 bg-amber-50/40 rounded-md p-4">
        {!abandonedAt ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-dark-slate">{t("abandonedHeading")}</p>
              <p className="text-xs text-dark-slate/60 mt-0.5">
                {t("abandonedHint")}
              </p>
            </div>
            <button
              type="button"
              disabled={isAbandoning}
              onClick={() => {
                if (!confirm(t("confirmMarkAbandoned"))) return;
                startAbandoning(async () => {
                  const res = await markProjectAbandoned(slug);
                  if (!("error" in res)) setAbandonedAt(new Date().toISOString());
                });
              }}
              className="text-sm font-medium text-amber-700 border border-amber-400 rounded-md px-4 py-2 hover:bg-amber-100 transition-colors disabled:opacity-60 flex-shrink-0"
            >
              {isAbandoning ? t("savingButton") : t("markAbandonedButton")}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-sm font-medium text-dark-slate">{t("seekingOwnerHeading")}</p>
                <p className="text-xs text-dark-slate/60 mt-0.5">
                  {t("seekingOwnerHint")}
                </p>
              </div>
              <button
                type="button"
                disabled={isAbandoning}
                onClick={() => {
                  startAbandoning(async () => {
                    const res = await unmarkProjectAbandoned(slug);
                    if (!("error" in res)) setAbandonedAt(null);
                  });
                }}
                className="text-sm font-medium text-dark-slate/60 border border-dark-slate/20 rounded-md px-4 py-2 hover:bg-white transition-colors disabled:opacity-60 flex-shrink-0"
              >
                {isAbandoning ? t("savingButton") : t("cancelButton")}
              </button>
            </div>

            {ownershipInterests.length === 0 ? (
              <p className="text-xs text-dark-slate/40 italic">{t("noInterestYet")}</p>
            ) : (
              <ul className="space-y-2">
                {ownershipInterests.map((interest) => (
                  <li key={interest.id} className="flex items-center justify-between gap-3 bg-white rounded-md px-3 py-2 border border-amber-200">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark-slate truncate">{interest.user.name ?? t("unknownName")}</p>
                      {interest.message && <p className="text-xs text-dark-slate/60 truncate">{interest.message}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={isTransferring}
                      onClick={() => {
                        if (!confirm(t("confirmTransferOwnership", { name: interest.user.name ?? t("genericPerson") }))) return;
                        startTransferring(async () => { await transferOwnership(slug, interest.user.id); });
                      }}
                      className="text-xs font-medium text-white bg-seagrass hover:bg-seagrass/90 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60 flex-shrink-0"
                    >
                      {t("makeOwnerButton")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {checklist && (
        <div className="border border-muted-teal rounded-md p-4">
          <p className="text-sm font-medium text-dark-slate mb-3">{t("checklistHeading", { phase: tPhase(initial.phase) })}</p>
          <div className="flex flex-col gap-2">
            {checklist.map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doneKeys.has(item.key)}
                  disabled={isTogglingChecklist}
                  onChange={(e) => handleToggleChecklistItem(item.key, e.target.checked)}
                  className="accent-seagrass w-4 h-4"
                />
                <span className="text-sm text-dark-slate/80">{tChecklist(item.key)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-dark-slate mb-1">
          {t("tagsLabel")} <span className="text-dark-slate/50 font-normal">{t("tagsHint")}</span>
        </label>
        <input
          id="tags" name="tags" type="text"
          defaultValue={initial.tags.join(", ")}
          placeholder={t("tagsPlaceholder")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>


      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-dark-slate">
            {t("sdgGoalsLabel")}
          </label>
          {description.length >= 20 && (
            <button type="button" onClick={handleSuggest} disabled={isSuggesting}
              className="flex items-center gap-1.5 text-xs font-medium text-seagrass hover:text-dark-slate disabled:opacity-50">
              {isSuggesting ? t("analyzingButton") : t("suggestWithAiButton")}
            </button>
          )}
        </div>
        {reasoning && <p className="text-xs text-dark-slate/50 mb-2 italic">{reasoning}</p>}
        <div className="grid grid-cols-2 gap-2">
          {SDG_NUMBERS.map((n) => {
            const label = SDG_LABELS_EN[n];
            const isChecked = selected.has(n);
            const isSuggested = aiSuggested.includes(n);
            return (
              <label key={n}
                className={`flex items-center gap-2 cursor-pointer group rounded px-1 py-0.5 ${isSuggested && isChecked ? "bg-seagrass/10" : ""}`}>
                <input type="checkbox" name="sdgGoals" value={n}
                  checked={isChecked} onChange={() => toggle(n)}
                  className="accent-seagrass w-4 h-4 flex-shrink-0" />
                <SdgIcon n={n} size={20} />
                <span className={`text-xs ${isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60"}`}>
                  {label}
                </span>
                {isSuggested && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-seagrass">{t("aiBadge")}</span>}
              </label>
            );
          })}
        </div>
      </div>

      {skills.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            {t("skillsNeededLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalSuffix")}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="skillIds"
                  value={s.id}
                  defaultChecked={currentSkillIds.includes(s.id)}
                  className="sr-only peer"
                />
                <span className="inline-block px-3 py-1 rounded-full border border-muted-teal text-sm text-dark-slate/70 transition-all peer-checked:border-seagrass peer-checked:bg-seagrass/10 peer-checked:text-seagrass hover:border-dark-slate/40">
                  {s.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60">
          {isPending ? t("savingButton") : t("saveChangesButton")}
        </button>
        <a href={`/projects/${slug}`}
          className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">
          {t("cancelButton")}
        </a>
      </div>
    </form>

    {/* Status → kolumn. Its own form: it saves independently of the project
        fields above, and a nested <form> is invalid HTML. Only appears once the
        board has synced at least once, since that is what fills statusOptions. */}
    {github && github.statusOptions.length > 0 && (
      <form
        action={(formData) => startMappingTransition(() => updateGithubColumnMap(slug, formData))}
        className="mt-8 border border-muted-teal/40 rounded-xl p-4 flex flex-col gap-3"
      >
        <div>
          <h2 className="text-sm font-medium text-dark-slate">{t("githubColumnMapHeading")}</h2>
          <p className="text-xs text-dark-slate/50 mt-1">
            {t("githubColumnMapHint")}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {github.statusOptions.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate text-dark-slate/70">{option.name}</span>
              <select
                name={`columnMap:${option.name}`}
                defaultValue={columnForStatus(option.name, github.columnMap)}
                className="border border-muted-teal rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              >
                {COLUMNS.map((col) => (
                  <option key={col.key} value={col.key}>
                    {tKanban(COLUMN_LABEL_KEYS[col.key])}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={isMappingPending}
          className="self-start px-4 py-2 bg-seagrass text-white text-sm font-medium rounded hover:bg-seagrass/90 transition-colors disabled:opacity-60"
        >
          {isMappingPending ? t("savingButton") : t("saveColumnMappingButton")}
        </button>
      </form>
    )}
    </>
  );
}
