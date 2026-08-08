"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Props {
  projectSlug: string;
  initialScore: number | null;
  initialScalingPlan: string | null;
  isOwnerOrAdmin: boolean;
}

function ringColor(score: number): string {
  if (score < 40) return "#ef4444"; // red
  if (score < 70) return "#eab308"; // yellow
  return "#22c55e"; // green
}

export default function MaturityWidget({ projectSlug, initialScore, initialScalingPlan, isOwnerOrAdmin }: Props) {
  const t = useTranslations("MaturityWidget");
  const [score, setScore] = useState<number | null>(initialScore);
  const [scalingPlan, setScalingPlan] = useState<string | null>(initialScalingPlan);
  const [loading, setLoading] = useState(false);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const displayScore = score ?? 0;
  const offset = circumference - (displayScore / 100) * circumference;
  const color = ringColor(displayScore);

  async function handleCalculate() {
    setLoading(true);
    try {
      const res = await fetch("/api/maturity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectSlug }),
      });
      if (res.ok) {
        const data = await res.json() as { score: number; scalingPlan: string | null };
        setScore(data.score);
        setScalingPlan(data.scalingPlan);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-muted-teal/30 rounded p-4">
      <h2 className="text-sm font-semibold text-dark-slate mb-3">{t("title")}</h2>
      <div className="flex items-center gap-4">
        <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {score !== null && (
            <circle
              cx="40" cy="40" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          )}
          <text
            x="40" y="44"
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill={score !== null ? color : "#9ca3af"}
          >
            {score !== null ? score : "?"}
          </text>
        </svg>

        <div className="flex flex-col gap-2">
          {score !== null && score >= 70 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-green-500 px-2 py-0.5 rounded-full">
              {t("readyToScale")}
            </span>
          )}
          {scalingPlan && (
            <Link
              href={`/projects/${projectSlug}/scale`}
              className="text-xs text-seagrass hover:underline font-medium"
            >
              {t("viewScalingPlan")}
            </Link>
          )}
          {isOwnerOrAdmin && (
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="text-xs px-3 py-1 rounded bg-coral text-white font-medium hover:bg-watermelon disabled:opacity-50 transition-colors"
            >
              {loading ? t("calculating") : t("calculate")}
            </button>
          )}
        </div>
      </div>
      {score !== null && (
        <p className="text-xs text-dark-slate/50 mt-2">{t("scoreLabel", { score })}</p>
      )}
    </div>
  );
}
