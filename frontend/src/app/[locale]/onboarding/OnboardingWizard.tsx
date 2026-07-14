"use client";

import { useState } from "react";
import { saveOnboarding } from "./actions";

const GOALS = [
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
];

export default function OnboardingWizard() {
  const [goal, setGoal] = useState<string>("explore");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    const fd = new FormData();
    fd.set("goal", goal);
    await saveOnboarding(fd);
    // redirect happens server-side; reset pending if it somehow stays
    setPending(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-col gap-3">
        {GOALS.map((opt) => (
          <label
            key={opt.value}
            className={[
              "flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all duration-150",
              goal === opt.value
                ? "border-seagrass bg-seagrass/5"
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
                  ? "border-seagrass bg-seagrass"
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

      <div className="flex items-center justify-end mt-10">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-seagrass text-white text-sm font-semibold hover:bg-seagrass/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Sparar…" : "Kom igång →"}
        </button>
      </div>
    </div>
  );
}
