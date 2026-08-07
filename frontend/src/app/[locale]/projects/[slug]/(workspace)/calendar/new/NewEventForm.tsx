"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Props {
  slug: string;
  defaultType?: string;
  action: (formData: FormData) => Promise<void>;
}

export default function NewEventForm({ slug, defaultType = "meeting", action }: Props) {
  const t = useTranslations("NewEventForm");
  const [type, setType] = useState(defaultType);
  const isMilestone = type === "milestone";

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          {t("titleLabel")} <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder={isMilestone ? t("milestoneTitlePlaceholder") : t("eventTitlePlaceholder")}
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
          {t("descriptionLabel")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-dark-slate mb-1">
          {t("typeLabel")}
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
        >
          <option value="meeting">{t("typeMeeting")}</option>
          <option value="deadline">{t("typeDeadline")}</option>
          <option value="custom">{t("typeCustom")}</option>
          <option value="milestone">{t("typeMilestone")}</option>
        </select>
      </div>

      {isMilestone ? (
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-dark-slate mb-1">
            {t("dueDateLabel")}
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="startsAt" className="block text-sm font-medium text-dark-slate mb-1">
              {t("startsAtLabel")} <span className="text-watermelon">*</span>
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          <div>
            <label htmlFor="endsAt" className="block text-sm font-medium text-dark-slate mb-1">
              {t("endsAtLabel")}
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="bg-coral text-white text-sm font-medium px-5 py-2 rounded hover:bg-watermelon transition-colors"
        >
          {isMilestone ? t("submitMilestone") : t("submitEvent")}
        </button>
        <Link
          href={`/projects/${slug}/calendar`}
          className="text-sm text-dark-slate/60 hover:text-dark-slate px-5 py-2 rounded border border-muted-teal/40 transition-colors"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
