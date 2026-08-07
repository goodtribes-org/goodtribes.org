"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { addSkill, removeSkill } from "@/app/[locale]/profile/skill-actions";

type Skill = {
  id: string;
  name: string;
  tag: string;
  description: string;
  slug: string;
};

type Props = {
  skills: Skill[];
};

export default function SkillManager({ skills }: Props) {
  const [showForm, setShowForm] = useState(false);
  const t = useTranslations("SkillManager");

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide">
          {t("heading")}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-coral hover:text-seagrass underline underline-offset-4"
        >
          {showForm ? t("toggleCancel") : t("toggleAdd")}
        </button>
      </div>

      {skills.length === 0 && !showForm && (
        <p className="text-dark-slate/50 italic text-sm">{t("emptyState")}</p>
      )}

      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill) => (
            <li
              key={skill.id}
              className="flex items-center gap-1 bg-dry-sage text-dark-slate text-sm px-3 py-1 rounded-full"
            >
              <span>{skill.name}</span>
              <span className="text-dark-slate/40 text-xs">#{skill.tag}</span>
              <form action={removeSkill.bind(null, skill.id)}>
                <button
                  type="submit"
                  className="ml-1 text-dark-slate/40 hover:text-coral text-xs leading-none"
                  aria-label={t("removeSkillAriaLabel", { name: skill.name })}
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form action={addSkill} className="border border-muted-teal rounded-lg p-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("nameLabel")}</label>
            <input
              name="name"
              required
              placeholder={t("namePlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm bg-yellow-50 focus:outline-none focus:border-seagrass"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("tagLabel")}</label>
            <input
              name="tag"
              required
              placeholder={t("tagPlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm bg-yellow-50 focus:outline-none focus:border-seagrass"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">{t("descriptionLabel")}</label>
            <textarea
              name="description"
              required
              rows={2}
              placeholder={t("descriptionPlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm bg-yellow-50 focus:outline-none focus:border-seagrass resize-none"
            />
          </div>
          <button
            type="submit"
            className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
          >
            {t("saveButton")}
          </button>
        </form>
      )}
    </section>
  );
}
