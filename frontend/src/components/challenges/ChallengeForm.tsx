"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import FileUpload from "@/components/FileUpload";
import { toProxyUrl } from "@/lib/storageUrl";
import { createChallenge, updateChallenge, type ChallengeInput } from "@/app/[locale]/challenges/actions";

// Create (orgSlug) or edit (slug) a challenge (#228). A new one is saved
// as a draft; publishing happens on the challenge page.
export default function ChallengeForm({
  orgSlug,
  slug,
  initial,
}: {
  orgSlug?: string;
  slug?: string;
  initial?: ChallengeInput;
}) {
  const t = useTranslations("ChallengeForm");
  const router = useRouter();
  const [data, setData] = useState<ChallengeInput>(
    initial ?? { title: "", description: "", supportText: "", closesOn: "", imageUrl: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof ChallengeInput, v: string) => setData((d) => ({ ...d, [k]: v }));

  function save() {
    setError(null);
    start(async () => {
      const res = slug ? await updateChallenge(slug, data) : await createChallenge(orgSlug!, data);
      if ("error" in res) setError(t(`error.${res.error}`));
      else router.push(`/challenges/${res.slug}`);
    });
  }

  const label = "block text-sm font-medium text-dark-slate mb-1";
  const input = "w-full rounded-md border border-muted-teal px-3 py-2 text-sm focus:border-seagrass focus:outline-none";
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={label} htmlFor="challenge-title">{t("title")}</label>
        <input id="challenge-title" className={input} value={data.title} maxLength={200} placeholder={t("titlePlaceholder")} onChange={(e) => set("title", e.target.value)} />
        <p className="mt-1 text-xs text-dark-slate/50">{t("titleHint")}</p>
      </div>
      <div>
        <span className={label}>{t("description")}</span>
        <RichTextEditor content={data.description} onChange={(html) => set("description", html)} ariaLabel={t("description")} />
        <p className="mt-1 text-xs text-dark-slate/50">{t("descriptionHint")}</p>
      </div>
      <div>
        <label className={label} htmlFor="challenge-closes">{t("closesOn")}</label>
        <input id="challenge-closes" type="date" className={`${input} max-w-[200px]`} value={data.closesOn} onChange={(e) => set("closesOn", e.target.value)} />
      </div>
      <div>
        <label className={label} htmlFor="challenge-support">{t("supportText")}</label>
        <textarea id="challenge-support" rows={3} className={input} maxLength={1000} value={data.supportText} placeholder={t("supportPlaceholder")} onChange={(e) => set("supportText", e.target.value)} />
        <p className="mt-1 text-xs text-dark-slate/50">{t("supportHint")}</p>
      </div>
      <div>
        <span className={label}>{t("image")}</span>
        <FileUpload
          visibility="public"
          accept="image/*"
          currentImageUrl={data.imageUrl ? toProxyUrl(data.imageUrl) : undefined}
          previewClassName="w-40 h-24 rounded-lg"
          onUpload={(url) => set("imageUrl", url)}
        />
      </div>
      {error && <p className="text-sm text-watermelon">{error}</p>}
      <div>
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-coral px-6 py-2.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60">
          {pending ? t("saving") : slug ? t("save") : t("create")}
        </button>
      </div>
    </div>
  );
}
