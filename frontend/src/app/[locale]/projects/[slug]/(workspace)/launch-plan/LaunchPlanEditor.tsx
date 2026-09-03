"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  updateLaunchPlan,
  addLaunchPlanChannel,
  deleteLaunchPlanChannel,
  addLaunchPlanMilestone,
  toggleLaunchPlanMilestone,
  deleteLaunchPlanMilestone,
} from "./actions";
import type { ChannelPlanStatus } from "@prisma/client";

const STATUSES: ChannelPlanStatus[] = ["PLANNED", "ACTIVE", "DONE"];

interface Channel {
  id: string;
  name: string;
  tactic: string | null;
  owner: string | null;
  budget: string | null;
  plannedDate: Date | string | null;
  status: ChannelPlanStatus;
}

interface Milestone {
  id: string;
  date: Date | string;
  description: string;
  done: boolean;
}

interface Props {
  projectSlug: string;
  canEdit: boolean;
  initial: {
    targetAudience: string;
    positioning: string;
    budgetOverview: string;
    successMetrics: string;
  };
  channels: Channel[];
  milestones: Milestone[];
}

const STATUS_CLASS: Record<ChannelPlanStatus, string> = {
  PLANNED: "bg-dark-slate/10 text-dark-slate/60",
  ACTIVE: "bg-coral/15 text-coral",
  DONE: "bg-seagrass/15 text-seagrass",
};

export default function LaunchPlanEditor({ projectSlug, canEdit, initial, channels: initialChannels, milestones: initialMilestones }: Props) {
  const t = useTranslations("LaunchPlanPage");
  const [fields, setFields] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [channels, setChannels] = useState(initialChannels);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [pending, startTransition] = useTransition();
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const channelNameRef = useRef<HTMLInputElement>(null);
  const channelTacticRef = useRef<HTMLInputElement>(null);
  const channelOwnerRef = useRef<HTMLInputElement>(null);
  const channelBudgetRef = useRef<HTMLInputElement>(null);
  const channelDateRef = useRef<HTMLInputElement>(null);
  const channelStatusRef = useRef<HTMLSelectElement>(null);

  const milestoneDateRef = useRef<HTMLInputElement>(null);
  const milestoneDescRef = useRef<HTMLInputElement>(null);

  function handleFieldChange(field: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSaveNarrative() {
    startTransition(async () => {
      await updateLaunchPlan(projectSlug, fields);
      setSaved(true);
    });
  }

  function handleAddChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = channelNameRef.current?.value.trim() ?? "";
    if (!name) return;
    startTransition(async () => {
      const result = await addLaunchPlanChannel(projectSlug, {
        name,
        tactic: channelTacticRef.current?.value.trim() ?? "",
        owner: channelOwnerRef.current?.value.trim() ?? "",
        budget: channelBudgetRef.current?.value.trim() ?? "",
        plannedDate: channelDateRef.current?.value ?? "",
        status: channelStatusRef.current?.value ?? "PLANNED",
      });
      if (result && "channel" in result && result.channel) {
        setChannels((prev) => [...prev, result.channel as Channel]);
        setShowChannelForm(false);
      }
    });
  }

  function handleDeleteChannel(id: string) {
    startTransition(async () => {
      const result = await deleteLaunchPlanChannel(id);
      if (result && "ok" in result && result.ok) setChannels((prev) => prev.filter((c) => c.id !== id));
    });
  }

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    const description = milestoneDescRef.current?.value.trim() ?? "";
    const date = milestoneDateRef.current?.value ?? "";
    if (!description || !date) return;
    startTransition(async () => {
      const result = await addLaunchPlanMilestone(projectSlug, { date, description });
      if (result && "milestone" in result && result.milestone) {
        setMilestones((prev) => [...prev, result.milestone as Milestone].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setShowMilestoneForm(false);
      }
    });
  }

  function handleToggleMilestone(id: string, done: boolean) {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, done } : m)));
    startTransition(async () => {
      await toggleLaunchPlanMilestone(id, done);
    });
  }

  function handleDeleteMilestone(id: string) {
    startTransition(async () => {
      const result = await deleteLaunchPlanMilestone(id);
      if (result && "ok" in result && result.ok) setMilestones((prev) => prev.filter((m) => m.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-dark-slate mb-4">{t("heading")}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["targetAudience", "positioning", "budgetOverview", "successMetrics"] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-dark-slate mb-1">{t(`${field}Label`)}</label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={fields[field]}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                placeholder={t(`${field}Placeholder`)}
                className="w-full border border-muted-teal rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none disabled:bg-muted-teal/5"
              />
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleSaveNarrative}
              disabled={pending || saved}
              className="bg-dark-slate text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saved ? t("savedLabel") : t("saveButton")}
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-dark-slate uppercase tracking-wide">{t("channelsHeading")}</h2>
          {canEdit && (
            <button type="button" onClick={() => setShowChannelForm((s) => !s)} className="text-xs font-medium text-seagrass hover:underline">
              {showChannelForm ? t("cancelButton") : t("addChannelButton")}
            </button>
          )}
        </div>
        {showChannelForm && canEdit && (
          <form onSubmit={handleAddChannel} className="border border-muted-teal/30 rounded-lg bg-white p-3 mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input ref={channelNameRef} type="text" required placeholder={t("channelNamePlaceholder")} className="border border-muted-teal rounded px-2 py-1 text-sm" />
            <input ref={channelTacticRef} type="text" placeholder={t("channelTacticPlaceholder")} className="border border-muted-teal rounded px-2 py-1 text-sm" />
            <input ref={channelOwnerRef} type="text" placeholder={t("channelOwnerPlaceholder")} className="border border-muted-teal rounded px-2 py-1 text-sm" />
            <input ref={channelBudgetRef} type="text" placeholder={t("channelBudgetPlaceholder")} className="border border-muted-teal rounded px-2 py-1 text-sm" />
            <input ref={channelDateRef} type="date" className="border border-muted-teal rounded px-2 py-1 text-sm" />
            <select ref={channelStatusRef} defaultValue="PLANNED" className="border border-muted-teal rounded px-2 py-1 text-sm bg-white">
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
            </select>
            <div className="col-span-full flex justify-end">
              <button type="submit" disabled={pending} className="bg-dark-slate text-white text-xs font-medium px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
                {t("saveButton")}
              </button>
            </div>
          </form>
        )}
        {channels.length === 0 ? (
          <p className="text-sm text-dark-slate/40 italic">{t("channelsEmptyState")}</p>
        ) : (
          <div className="overflow-x-auto border border-muted-teal/30 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted-teal/10 text-left text-xs text-dark-slate/50 uppercase tracking-wide">
                  <th className="px-3 py-2">{t("channelColumnName")}</th>
                  <th className="px-3 py-2">{t("channelColumnTactic")}</th>
                  <th className="px-3 py-2">{t("channelColumnOwner")}</th>
                  <th className="px-3 py-2">{t("channelColumnBudget")}</th>
                  <th className="px-3 py-2">{t("channelColumnDate")}</th>
                  <th className="px-3 py-2">{t("channelColumnStatus")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.id} className="border-t border-muted-teal/20">
                    <td className="px-3 py-2 font-medium text-dark-slate">{c.name}</td>
                    <td className="px-3 py-2 text-dark-slate/70">{c.tactic ?? ""}</td>
                    <td className="px-3 py-2 text-dark-slate/70">{c.owner ?? ""}</td>
                    <td className="px-3 py-2 text-dark-slate/70">{c.budget ?? ""}</td>
                    <td className="px-3 py-2 text-dark-slate/70 whitespace-nowrap">{c.plannedDate ? new Date(c.plannedDate).toLocaleDateString() : ""}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[c.status]}`}>{t(`status_${c.status}`)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canEdit && (
                        <button onClick={() => handleDeleteChannel(c.id)} disabled={pending} className="text-[10px] font-medium text-dark-slate/40 hover:text-coral transition-colors">
                          {t("removeButton")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-dark-slate uppercase tracking-wide">{t("milestonesHeading")}</h2>
          {canEdit && (
            <button type="button" onClick={() => setShowMilestoneForm((s) => !s)} className="text-xs font-medium text-seagrass hover:underline">
              {showMilestoneForm ? t("cancelButton") : t("addMilestoneButton")}
            </button>
          )}
        </div>
        {showMilestoneForm && canEdit && (
          <form onSubmit={handleAddMilestone} className="border border-muted-teal/30 rounded-lg bg-white p-3 mb-3 flex gap-2">
            <input ref={milestoneDateRef} type="date" required className="border border-muted-teal rounded px-2 py-1 text-sm" />
            <input ref={milestoneDescRef} type="text" required placeholder={t("milestoneDescriptionPlaceholder")} className="flex-1 border border-muted-teal rounded px-2 py-1 text-sm" />
            <button type="submit" disabled={pending} className="bg-dark-slate text-white text-xs font-medium px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
              {t("saveButton")}
            </button>
          </form>
        )}
        {milestones.length === 0 ? (
          <p className="text-sm text-dark-slate/40 italic">{t("milestonesEmptyState")}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {milestones.map((m) => (
              <label key={m.id} className="flex items-center gap-2.5 border border-muted-teal/30 rounded-lg bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={m.done}
                  disabled={!canEdit || pending}
                  onChange={(e) => handleToggleMilestone(m.id, e.target.checked)}
                  className="accent-seagrass w-4 h-4 flex-shrink-0"
                />
                <span className="text-xs text-dark-slate/50 whitespace-nowrap">{new Date(m.date).toLocaleDateString()}</span>
                <span className={`text-sm flex-1 ${m.done ? "text-dark-slate/30 line-through" : "text-dark-slate/80"}`}>{m.description}</span>
                {canEdit && (
                  <button type="button" onClick={() => handleDeleteMilestone(m.id)} disabled={pending} className="text-[10px] font-medium text-dark-slate/40 hover:text-coral transition-colors">
                    {t("removeButton")}
                  </button>
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
