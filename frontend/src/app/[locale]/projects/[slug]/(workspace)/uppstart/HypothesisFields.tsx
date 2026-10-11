"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { composeHypothesis, parseHypothesis, type HypothesisParts, type HypothesisWords } from "@/lib/mvp";
import { saveUppstartPlan } from "./actions";

// "Vad testar vi?" as three short fields that read as one sentence (#320):
// "Vi tror att [vilka] vill [vad], och vi vet det när [tecken]." The words
// around the fields are in the project's language, the same words the
// sentence is saved with. A sentence written freely before (it doesn't fit
// the template) is kept and edited as it is, in one field. Open for writing
// until all three parts are there, like PlanFields.
export default function HypothesisFields({ slug, value, words, canEdit }: { slug: string; value: string | null; words: HypothesisWords; canEdit: boolean }) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const parsed = parseHypothesis(value, words);
  const free = !!value?.trim() && !parsed;
  const initial: HypothesisParts = parsed ?? { who: "", what: "", sign: "" };
  const complete = free || (!!initial.who && !!initial.what && !!initial.sign);
  const [editing, setEditing] = useState(canEdit && !complete);
  const [parts, setParts] = useState(initial);
  const [freeText, setFreeText] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // All three parts or none: a half sentence couldn't be read back as parts.
  const ready = free || (!!parts.who.trim() && !!parts.what.trim() && !!parts.sign.trim());

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveUppstartPlan(slug, { hypothesis: free ? freeText : composeHypothesis(parts, words) });
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base text-dark-slate">{value?.trim() || <span className="text-dark-slate/40">—</span>}</p>
        {canEdit && (
          <button type="button" onClick={() => setEditing(true)} className="self-start text-sm font-medium text-seagrass hover:underline">
            {t("edit")}
          </button>
        )}
      </div>
    );
  }

  const field = (key: keyof HypothesisParts, label: string, placeholder: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-dark-slate">{label}</span>
      <input
        value={parts[key]}
        onChange={(e) => setParts((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      {free ? (
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          className="rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none"
        />
      ) : (
        <>
          {field("who", `${words.hypWe} …`, t("hypothesisWhoPlaceholder"))}
          {field("what", `… ${words.hypWant} …`, t("hypothesisWhatPlaceholder"))}
          {field("sign", `… ${words.hypKnow} …`, t("hypothesisSignPlaceholder"))}
          {(parts.who || parts.what || parts.sign) && (
            <p className="rounded-lg bg-dry-sage/20 px-3 py-2 text-sm italic text-dark-slate/80">{composeHypothesis(parts, words)}</p>
          )}
        </>
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !ready} className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? t("saving") : t("save")}
        </button>
        {complete && (
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("cancel")}
          </button>
        )}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}
