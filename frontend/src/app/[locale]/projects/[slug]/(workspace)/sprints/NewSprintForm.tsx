"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createSprint } from "./actions";
import type { SprintPace } from "@prisma/client";

export default function NewSprintForm({ projectSlug }: { projectSlug: string }) {
  const t = useTranslations("NewSprintForm");
  const [name, setName] = useState("");
  const [pace, setPace] = useState<SprintPace>("SPREAD_OUT");
  const [phaseDurationDays, setPhaseDurationDays] = useState(3);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(() => createSprint(projectSlug, name, pace, pace === "SPREAD_OUT" ? phaseDurationDays : undefined));
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-muted-teal/30 rounded-xl p-4 flex flex-col gap-4">
      <p className="text-sm font-medium text-dark-slate">{t("title")}</p>

      <div>
        <label htmlFor="sprintName" className="block text-xs font-medium text-dark-slate/70 mb-1">
          {t("nameLabel")}
        </label>
        <input
          id="sprintName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-dark-slate/70 mb-2">{t("paceLabel")}</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="pace"
              checked={pace === "TOGETHER"}
              onChange={() => setPace("TOGETHER")}
              className="accent-seagrass mt-0.5"
            />
            <span className="text-sm text-dark-slate/80">
              {t("paceTogetherLabel")} <span className="text-dark-slate/50">— {t("paceTogetherDescription")}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="pace"
              checked={pace === "SPREAD_OUT"}
              onChange={() => setPace("SPREAD_OUT")}
              className="accent-seagrass mt-0.5"
            />
            <span className="text-sm text-dark-slate/80">
              {t("paceSpreadOutLabel")} <span className="text-dark-slate/50">— {t("paceSpreadOutDescription")}</span>
            </span>
          </label>
        </div>
      </div>

      {pace === "SPREAD_OUT" && (
        <div>
          <label htmlFor="phaseDays" className="block text-xs font-medium text-dark-slate/70 mb-1">
            {t("phaseDaysLabel")}
          </label>
          <input
            id="phaseDays"
            type="number"
            min={1}
            max={30}
            value={phaseDurationDays}
            onChange={(e) => setPhaseDurationDays(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="self-start bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
      >
        {isPending ? t("submittingButton") : t("submitButton")}
      </button>
    </form>
  );
}
