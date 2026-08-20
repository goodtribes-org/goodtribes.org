"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { updateSandboxHero, type SandboxHeroInput } from "@/app/[locale]/sandbox-hero-actions";
import RichTextEditor from "@/components/RichTextEditor";
import type { Locale } from "next-intl";

const PILLAR_FIELDS = [
  { key: "levaGott", headingKey: "levaGottHeading", bodyKey: "levaGottBody" },
  { key: "maGott", headingKey: "maGottHeading", bodyKey: "maGottBody" },
  { key: "goraGott", headingKey: "goraGottHeading", bodyKey: "goraGottBody" },
  { key: "dreamGood", headingKey: "dreamGoodHeading", bodyKey: "dreamGoodBody" },
] as const satisfies readonly {
  key: string;
  headingKey: keyof SandboxHeroInput;
  bodyKey: keyof SandboxHeroInput;
}[];

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-dark-slate/70 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-base focus:outline-none focus:border-seagrass"
      />
    </label>
  );
}

function RichField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-dark-slate/70 mb-1">{label}</span>
      <RichTextEditor content={value} onChange={onChange} />
    </div>
  );
}

export default function SandboxHeroEditor({
  initialData,
  locale,
}: {
  initialData: SandboxHeroInput;
  locale: Locale;
}) {
  const t = useTranslations("SandboxHeroEditor");
  const tPillars = useTranslations("SandboxPillars");
  const [data, setData] = useState(initialData);
  const [saved, setSaved] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof SandboxHeroInput>(key: K, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateSandboxHero(data, locale);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(data);
    });
  }

  const isDirty = JSON.stringify(data) !== JSON.stringify(saved);
  const pillarLabels: Record<string, string> = {
    levaGott: tPillars("levaGottHeading"),
    maGott: tPillars("maGottHeading"),
    goraGott: tPillars("goraGottHeading"),
    dreamGood: tPillars("dreamGoodHeading"),
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-dark-slate">{t("introSectionTitle")}</h3>
        <TextField label={t("heroKickerLabel")} value={data.heroKicker} onChange={(v) => set("heroKicker", v)} />
        <RichField
          label={t("heroDescriptionLabel")}
          value={data.heroDescription}
          onChange={(v) => set("heroDescription", v)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PILLAR_FIELDS.map(({ key, headingKey, bodyKey }) => (
          <div key={key} className="border border-muted-teal/20 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-dark-slate">{pillarLabels[key]}</h3>
            <TextField label={t("pillarHeadingLabel")} value={data[headingKey]} onChange={(v) => set(headingKey, v)} />
            <RichField label={t("pillarBodyLabel")} value={data[bodyKey]} onChange={(v) => set(bodyKey, v)} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
        >
          {isPending ? t("savingButton") : t("saveButton")}
        </button>
        {error && <p className="text-xs text-coral">{error}</p>}
      </div>
    </div>
  );
}
