"use client";

import { useState } from "react";
import { saveOnboarding } from "./actions";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_SV } from "@/lib/sdg";

interface Skill {
  id: string;
  name: string;
  tag: string;
}

interface Props {
  skills: Skill[];
}

const TOTAL_STEPS = 3;

export default function OnboardingWizard({ skills }: Props) {
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [goal, setGoal] = useState<string>("explore");
  const [pending, setPending] = useState(false);

  function toggleInterest(id: number) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSkill(id: string) {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    setPending(true);
    const fd = new FormData();
    selectedInterests.forEach((i) => fd.append("interests", String(i)));
    selectedSkills.forEach((s) => fd.append("skillIds", s));
    fd.set("goal", goal);
    await saveOnboarding(fd);
    // redirect happens server-side; reset pending if it somehow stays
    setPending(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3 mb-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
          const s = i + 1;
          return (
            <button
              key={s}
              type="button"
              onClick={() => s < step && setStep(s)}
              aria-label={`Step ${s}`}
              className={[
                "w-3 h-3 rounded-full transition-all duration-200",
                step === s
                  ? "bg-forest-green w-8"
                  : s < step
                  ? "bg-forest-green/50 cursor-pointer hover:bg-forest-green/70"
                  : "bg-dark-slate/20",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* Step 1 — SDG interests */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-1">Vad brinner du för?</h2>
          <p className="text-dark-slate/60 mb-6 text-sm">
            Välj de globala mål som engagerar dig mest. Du kan ändra detta när som helst.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SDG_NUMBERS.map((id) => {
              const active = selectedInterests.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleInterest(id)}
                  className={[
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all duration-150",
                    active
                      ? "border-dark-slate/60 bg-dark-slate/5 shadow-sm"
                      : "border-gray-200 text-dark-slate hover:border-gray-400",
                  ].join(" ")}
                >
                  <SdgIcon n={id} size={28} />
                  <span className="leading-tight text-dark-slate">{SDG_LABELS_SV[id]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 — Skills */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold mb-1">Vad kan du bidra med?</h2>
          <p className="text-dark-slate/60 mb-6 text-sm">
            Välj de kompetenser du vill använda. Du kan lägga till fler i din profil.
          </p>
          {/* Group by tag */}
          {Object.entries(
            skills.reduce<Record<string, Skill[]>>((acc, s) => {
              (acc[s.tag] = acc[s.tag] ?? []).push(s);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tag, tagSkills]) => (
              <div key={tag} className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-dark-slate/40 mb-2">
                  {tag}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tagSkills.map((skill) => {
                    const active = selectedSkills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={[
                          "rounded-full border px-3 py-1 text-sm font-medium transition-all duration-150",
                          active
                            ? "border-forest-green bg-forest-green text-white"
                            : "border-dark-slate/25 text-dark-slate hover:border-forest-green/60",
                        ].join(" ")}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Step 3 — Goal */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold mb-1">Vad vill du göra?</h2>
          <p className="text-dark-slate/60 mb-6 text-sm">
            Vi anpassar din upplevelse baserat på ditt val.
          </p>
          <div className="flex flex-col gap-3">
            {[
              {
                value: "start",
                title: "Starta ett projekt",
                desc: "Jag har en idé och vill hitta medgrundare och frivilliga.",
                icon: "🚀",
              },
              {
                value: "join",
                title: "Gå med i ett projekt",
                desc: "Jag vill bidra med mina kunskaper till ett befintligt initiativ.",
                icon: "🤝",
              },
              {
                value: "explore",
                title: "Utforska plattformen",
                desc: "Jag vill se vad som finns innan jag bestämmer mig.",
                icon: "🔍",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                className={[
                  "flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all duration-150",
                  goal === opt.value
                    ? "border-forest-green bg-forest-green/5"
                    : "border-dark-slate/15 hover:border-dark-slate/35",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="goal"
                  value={opt.value}
                  checked={goal === opt.value}
                  onChange={() => setGoal(opt.value)}
                  className="sr-only"
                />
                <span className="text-2xl mt-0.5">{opt.icon}</span>
                <div>
                  <p className="font-semibold text-dark-slate">{opt.title}</p>
                  <p className="text-sm text-dark-slate/60 mt-0.5">{opt.desc}</p>
                </div>
                <span
                  className={[
                    "ml-auto mt-1 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                    goal === opt.value
                      ? "border-forest-green bg-forest-green"
                      : "border-dark-slate/30",
                  ].join(" ")}
                >
                  {goal === opt.value && (
                    <span className="w-2 h-2 rounded-full bg-white block" />
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 rounded-lg border border-dark-slate/25 text-sm font-medium text-dark-slate hover:border-dark-slate/50 transition-colors"
          >
            Tillbaka
          </button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="px-6 py-2.5 rounded-lg bg-forest-green text-white text-sm font-semibold hover:bg-forest-green/90 transition-colors"
          >
            Nästa
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="px-6 py-2.5 rounded-lg bg-forest-green text-white text-sm font-semibold hover:bg-forest-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? "Sparar…" : "Kom igång →"}
          </button>
        )}
      </div>
    </div>
  );
}
