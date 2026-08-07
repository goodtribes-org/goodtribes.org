"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import FileUpload from "@/components/FileUpload";
import { updateOrg, deleteOrg } from "./actions";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  description: string;
  imageUrl: string | null;
  isPublic: boolean;
  category: string | null;
  country: string | null;
  skills: { id: string; name: string; slug: string }[];
  currentSkillIds: string[];
};

export default function EditOrgForm({
  orgId,
  orgName,
  description,
  imageUrl,
  isPublic,
  category,
  country,
  skills,
  currentSkillIds,
}: Props) {
  const t = useTranslations("EditOrgForm");
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={updateOrg} className="flex flex-col gap-5">
        <input type="hidden" name="orgId" value={orgId} />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-dark-slate mb-1">
            {t("nameLabel")} <span className="text-watermelon">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={orgName}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
            {t("descriptionLabel")}
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={description}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">{t("logoLabel")}</label>
          <FileUpload
            visibility="public"
            accept="image/*"
            currentImageUrl={imageUrl ?? undefined}
            onUpload={(url) => {
              if (imageInputRef.current) imageInputRef.current.value = url;
            }}
          />
          <input type="hidden" name="imageUrl" ref={imageInputRef} defaultValue={imageUrl ?? ""} />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
            {t("categoryLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalSuffix")}</span>
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? ""}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="">{t("noneOption")}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-dark-slate mb-1">
            {t("countryLabel")} <span className="text-dark-slate/50 font-normal">{t("countryHint")}</span>
          </label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={country ?? ""}
            placeholder={t("countryPlaceholder")}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        {skills.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-dark-slate mb-2">
              {t("skillsSoughtLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalSuffix")}</span>
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

        <div className="flex items-center gap-3">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            defaultChecked={isPublic}
            className="accent-seagrass w-4 h-4"
          />
          <label htmlFor="isPublic" className="text-sm text-dark-slate">
            {t("showPubliclyLabel")}
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
        >
          {t("saveButton")}
        </button>
      </form>

      <div className="mt-12 border-t border-muted-teal/40 pt-8">
        <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("dangerZoneHeading")}
        </h2>
        <p className="text-sm text-dark-slate/70 mb-4">
          {t("dangerZoneDescription")}
        </p>
        <form
          action={deleteOrg}
          onSubmit={(e) => {
            if (!confirm(t("deleteConfirm"))) e.preventDefault();
          }}
        >
          <input type="hidden" name="orgId" value={orgId} />
          <button
            type="submit"
            className="border border-watermelon text-watermelon text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon hover:text-white transition-colors"
          >
            {t("deleteButton")}
          </button>
        </form>
      </div>
    </>
  );
}
