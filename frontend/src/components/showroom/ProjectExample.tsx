import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont, showroomBodyFont, showroomMonoFont } from "@/lib/fonts";

const GANTT_ROWS = [1, 2, 3, 4, 5, 6, 7] as const;
const GANTT_STATUS: Record<number, "done" | "ongoing" | "planned"> = {
  1: "done", 2: "done", 3: "ongoing", 4: "ongoing", 5: "planned", 6: "planned", 7: "planned",
};
const STATUS_COLOR: Record<string, string> = {
  done: "var(--color-seagrass)",
  ongoing: "#f0b429",
  planned: "rgba(178,176,155,.7)",
};
const LEADERBOARD = [
  { initials: "MH", name: "Mattias", pts: 420, bg: "var(--color-seagrass)" },
  { initials: "KL", name: "Karin", pts: 180, bg: "var(--color-coral)" },
  { initials: "NG", name: "Niklas", pts: 95, bg: "#254441" },
];

// A fully static decorative mockup, not the real workspace app — see the
// design handoff's "enkel ljus ram, ingen riktig browser-chrome" note.
export default async function ProjectExample({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Showroom.projectExample" });
  const tabs = [
    t("tabHome"), t("tabTimeline"), t("tabTodo"), t("tabCalendar"), t("tabChat"), t("tabBlog"),
    t("tabFiles"), t("tabWiki"), t("tabIdeaWorkshop"), t("tabPolls"), t("tabFunding"), t("tabMembers"), t("tabImpact"),
  ];
  const phases = [
    { label: t("phaseIdea"), done: true },
    { label: t("phaseStart"), done: true },
    { label: t("phaseLaunch"), done: false },
    { label: t("phaseEstablish"), done: false },
    { label: t("phaseScale"), done: false },
    { label: t("phaseImpact"), done: false },
  ];
  const months = [
    t("ganttMonth1"), t("ganttMonth2"), t("ganttMonth3"), t("ganttMonth4"),
    t("ganttMonth5"), t("ganttMonth6"), t("ganttMonth7"), t("ganttMonth8"),
  ];
  const statusLabel = (s: "done" | "ongoing" | "planned") =>
    s === "done" ? t("statusDone") : s === "ongoing" ? t("statusOngoing") : t("statusPlanned");

  return (
    <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "76px 32px 8px" }}>
      <p className={showroomMonoFont.className} style={{ fontSize: 11.5, letterSpacing: ".16em", color: "rgba(37,68,65,.45)" }}>
        {t("eyebrow").toUpperCase()}
      </p>
      <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(34px,3.4vw,46px)" }}>
        {t("heading")}
      </h2>
      <p className="text-dark-slate/70 mt-2 mb-9" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: "60ch" }}>
        {t("intro")}
      </p>

      <div className="flex justify-center">
        <div
          className="bg-white w-full overflow-hidden"
          style={{ maxWidth: 1060, borderRadius: 18, border: "1px solid rgba(37,68,65,.12)", boxShadow: "0 24px 60px -30px rgba(37,68,65,.45)" }}
        >
          <div className="flex items-center justify-between border-b border-muted-teal/25 flex-wrap gap-2" style={{ padding: "14px 26px" }}>
            <div className="flex items-center gap-6">
              <span className={displaySerifFont.className} style={{ fontSize: 19, color: "#254441" }}>
                goodtribes<span style={{ color: "var(--color-coral)" }}>.</span>
              </span>
              <span className={showroomBodyFont.className} style={{ fontSize: 13, color: "#254441" }}>
                {t("navCreate")}
              </span>
              <span className={showroomBodyFont.className} style={{ fontSize: 13, color: "#254441" }}>
                {t("navExplore")}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className={showroomMonoFont.className} style={{ fontSize: 10.5, color: "#7a8a86" }}>
                SV · EN
              </span>
              <span className="rounded-full text-white font-medium" style={{ background: "#254441", padding: "6px 16px", fontSize: 12.5 }}>
                {t("joinButton")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-muted-teal/25 flex-wrap" style={{ padding: "22px 26px" }}>
            <div className="flex-shrink-0" style={{ width: 76, height: 76, borderRadius: 16, background: "#88D5F5" }} />
            <div className="flex-1 min-w-0">
              <h3 className={displaySerifFont.className} style={{ fontSize: 26, color: "#254441" }}>
                {t("projectTitle")}
              </h3>
              <p style={{ fontSize: 13, color: "rgba(37,68,65,.6)" }}>{t("projectSubtitle")}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span style={{ width: 26, height: 26, borderRadius: 6, background: "#f0b429", display: "inline-block" }} />
              <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--color-coral)", display: "inline-block" }} />
              <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--color-seagrass)", display: "inline-block" }} />
              <span className={showroomMonoFont.className} style={{ fontSize: 10, color: "#fff", background: "var(--color-seagrass)", borderRadius: 999, padding: "3px 10px" }}>
                {t("statusActive").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center border-b border-muted-teal/25 overflow-x-auto" style={{ padding: "16px 26px", gap: 10 }}>
            {phases.map((p, i) => (
              <div key={p.label} className="flex items-center flex-shrink-0" style={{ gap: 10 }}>
                <span
                  className="rounded-full"
                  style={{
                    width: 13,
                    height: 13,
                    background: p.done ? "var(--color-seagrass)" : "#fff",
                    border: `2px solid ${p.done ? "var(--color-seagrass)" : "rgba(178,176,155,.7)"}`,
                  }}
                />
                <span style={{ fontSize: 12.5, whiteSpace: "nowrap", color: p.done ? "#254441" : "rgba(37,68,65,.45)" }}>{p.label}</span>
                {i < phases.length - 1 && <span style={{ width: 28, height: 1, background: p.done ? "var(--color-seagrass)" : "rgba(178,176,155,.5)" }} />}
              </div>
            ))}
          </div>

          <div className="flex overflow-x-auto border-b border-muted-teal/25" style={{ padding: "0 26px", gap: 18 }}>
            {tabs.map((tab, i) => (
              <span
                key={tab}
                className="flex-shrink-0"
                style={{
                  fontSize: 12.5,
                  padding: "9px 0",
                  whiteSpace: "nowrap",
                  color: i === 1 ? "#254441" : "rgba(37,68,65,.55)",
                  fontWeight: i === 1 ? 500 : 400,
                  borderBottom: i === 1 ? "2px solid var(--color-coral)" : "2px solid transparent",
                }}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="grid gap-5" style={{ padding: 20, gridTemplateColumns: "1.45fr 1fr" }}>
            <div className="bg-white border border-muted-teal/35 overflow-x-auto" style={{ borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#254441", marginBottom: 10 }}>{t("ganttHeading")}</p>
              <div style={{ minWidth: 560 }}>
                <div className="grid" style={{ gridTemplateColumns: "150px repeat(8, 1fr)" }}>
                  <span />
                  {months.map((m) => (
                    <span key={m} className={showroomMonoFont.className} style={{ fontSize: 9, textAlign: "center", color: "rgba(37,68,65,.5)" }}>
                      {m.toUpperCase()}
                    </span>
                  ))}
                </div>
                {GANTT_ROWS.map((row) => (
                  <div key={row} className="grid items-center" style={{ gridTemplateColumns: "150px repeat(8, 1fr)", marginTop: 8 }}>
                    <span style={{ fontSize: 11.5, lineHeight: 1.35, color: "rgba(37,68,65,.85)" }}>{t(`ganttRow${row}`)}</span>
                    <div style={{ gridColumn: "span 3" }}>
                      <span
                        className={showroomMonoFont.className}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 20,
                          borderRadius: 999,
                          background: STATUS_COLOR[GANTT_STATUS[row]],
                          color: "#fff",
                          fontSize: 8.5,
                          textTransform: "uppercase",
                          padding: "0 9px",
                        }}
                      >
                        {statusLabel(GANTT_STATUS[row])}
                      </span>
                    </div>
                  </div>
                ))}
                <p className={showroomMonoFont.className} style={{ marginTop: 10, fontSize: 10, color: "var(--color-coral)" }}>
                  {t("todayMarker")}
                </p>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: 11 }}>
              <div className="bg-white border border-muted-teal/35" style={{ borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#254441" }}>
                  {t("fundingRaised")} <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(37,68,65,.6)" }}>{t("fundingGoal")}</span>
                </p>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(178,176,155,.35)", marginTop: 8, marginBottom: 10 }}>
                  <div style={{ width: "64%", height: "100%", borderRadius: 999, background: "var(--color-seagrass)" }} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="rounded-full text-white" style={{ background: "var(--color-coral)", fontSize: 12, padding: "6px 14px" }}>
                    {t("fundingSupport")}
                  </span>
                  <span className="rounded-full" style={{ border: "1px solid rgba(37,68,65,.2)", fontSize: 12, padding: "6px 14px", color: "#254441" }}>
                    {t("fundingShare")}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-muted-teal/35" style={{ borderRadius: 14, padding: 14 }}>
                <div className="flex justify-between flex-wrap gap-1" style={{ fontSize: 11, color: "rgba(37,68,65,.7)" }}>
                  <span>{t("taskWanted")} 6</span>
                  <span>{t("taskTodo")} 8</span>
                  <span style={{ color: "#f0b429" }}>{t("taskDoing")} 3</span>
                  <span>{t("taskReview")} 1</span>
                  <span style={{ color: "var(--color-seagrass)" }}>{t("taskDone")} 14</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(178,176,155,.35)", marginTop: 8, marginBottom: 6 }}>
                  <div style={{ width: "44%", height: "100%", borderRadius: 999, background: "#254441" }} />
                </div>
                <p style={{ fontSize: 11, color: "rgba(37,68,65,.6)" }}>{t("taskProgressCaption")}</p>
              </div>

              <div className="bg-white border border-muted-teal/35" style={{ borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#254441", marginBottom: 8 }}>{t("leaderboardHeading")}</p>
                {LEADERBOARD.map((row) => (
                  <div key={row.name} className="flex items-center gap-2" style={{ marginTop: 6, fontSize: 12 }}>
                    <span
                      className="rounded-full text-white flex items-center justify-center flex-shrink-0"
                      style={{ width: 22, height: 22, background: row.bg, fontSize: 9.5 }}
                    >
                      {row.initials}
                    </span>
                    <span style={{ flex: 1, color: "#254441" }}>{row.name}</span>
                    <span style={{ color: "rgba(37,68,65,.6)" }}>{row.pts} p</span>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-muted-teal/35" style={{ borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#254441", marginBottom: 6 }}>{t("calendarMonth")}</p>
                <div className="grid grid-cols-7" style={{ gap: 3 }}>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                    <span
                      key={day}
                      className="flex items-center justify-center"
                      style={{
                        aspectRatio: "1",
                        fontSize: 9,
                        borderRadius: 4,
                        background: day === 18 || day === 19 ? "var(--color-seagrass)" : "transparent",
                        color: day === 18 || day === 19 ? "#fff" : "rgba(37,68,65,.6)",
                      }}
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 10.5, color: "rgba(37,68,65,.6)", marginTop: 6 }}>{t("calendarCaption")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
