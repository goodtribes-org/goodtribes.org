"use client";

import { useState } from "react";
import { saveOnboarding } from "./actions";

interface Skill {
  id: string;
  name: string;
  tag: string;
}

interface Props {
  skills: Skill[];
}

// SDG goals: number → label + color
const SDG_GOALS: { id: number; label: string; color: string }[] = [
  { id: 1,  label: "Ingen fattigdom",               color: "#E5243B" },
  { id: 2,  label: "Ingen hunger",                  color: "#DDA63A" },
  { id: 3,  label: "God hälsa",                     color: "#4C9F38" },
  { id: 4,  label: "God utbildning",                color: "#C5192D" },
  { id: 5,  label: "Jämställdhet",                  color: "#FF3A21" },
  { id: 6,  label: "Rent vatten",                   color: "#26BDE2" },
  { id: 7,  label: "Hållbar energi",                color: "#FCC30B" },
  { id: 8,  label: "Anständigt arbete",             color: "#A21942" },
  { id: 9,  label: "Hållbar industri",              color: "#FD6925" },
  { id: 10, label: "Minskad ojämlikhet",            color: "#DD1367" },
  { id: 11, label: "Hållbara städer",               color: "#FD9D24" },
  { id: 12, label: "Hållbar konsumtion",            color: "#BF8B2E" },
  { id: 13, label: "Bekämpa klimatförändringen",    color: "#3F7E44" },
  { id: 14, label: "Hav och marina resurser",       color: "#0A97D9" },
  { id: 15, label: "Ekosystem och biologisk mångfald", color: "#56C02B" },
  { id: 16, label: "Fredliga samhällen",            color: "#00689D" },
  { id: 17, label: "Genomförande och partnerskap",  color: "#19486A" },
];

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
            {SDG_GOALS.map((sdg) => {
              const active = selectedInterests.includes(sdg.id);
              return (
                <button
                  key={sdg.id}
                  type="button"
                  onClick={() => toggleInterest(sdg.id)}
                  style={active ? { backgroundColor: sdg.color, borderColor: sdg.color } : { borderColor: sdg.color + "60" }}
                  className={[
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-all duration-150",
                    active
                      ? "text-white shadow-sm"
                      : "text-dark-slate hover:border-opacity-100",
                  ].join(" ")}
                >
                  <span
                    className="shrink-0 text-xs font-bold w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : sdg.color, color: active ? "white" : "white" }}
                  >
                    {sdg.id}
                  </span>
                  <span className="leading-tight">{sdg.label}</span>
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
