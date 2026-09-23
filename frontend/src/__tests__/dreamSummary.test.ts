import { coerceDreamSummary, planDreamWrites } from "../lib/dreamSummary";

const raw = {
  sections: { dream: "Äldre ska klara sig digitalt", problem: "Ensamma äldre", idea: "Volontärer lär ut", people: "Äldre, kommunen", conditions: "5 h/vecka, ensam" },
  open_questions: ["Hur många berörs?", "Hur många berörs?", ""],
  project: {
    title: { value: "Digital vardag", basis: "inferred" },
    summary: { value: "Volontärer hjälper äldre med datorer", basis: "user" },
    description: { value: "Lång text", basis: "user" },
    category: "Community",
    tags: ["äldre", "digitalisering"],
    sdg_goals: [3, 10, 11, 4, 99, 3],
  },
  canvas: {
    problem: { value: "Äldre hänger inte med digitalt", basis: "user" },
    solution: { value: "Handledning hemma", basis: "inferred" },
    channels: { value: "ska ignoreras — inte ett Drömsamtal-fält", basis: "user" },
    earlyAdopters: { value: "", basis: "user" },
  },
  conditions: { weekly_hours: 5.4, team_mode: "SOLO", ambition: "WORLD_DOMINATION" },
};

describe("coerceDreamSummary", () => {
  const s = coerceDreamSummary(raw);

  it("enforces at most 3 valid, unique SDG goals", () => {
    expect(s.project.sdgGoals).toEqual([3, 10, 11]);
  });

  it("keeps only known Drömsamtal canvas fields with content", () => {
    expect(Object.keys(s.canvas).sort()).toEqual(["problem", "solution"]);
  });

  it("dedupes open questions and sanitises conditions", () => {
    expect(s.openQuestions).toEqual(["Hur många berörs?"]);
    expect(s.conditions).toEqual({ weeklyHours: 5, teamMode: "SOLO", ambition: null });
  });

  it("rejects an unknown category and survives garbage input", () => {
    expect(coerceDreamSummary({ ...raw, project: { ...raw.project, category: "Space" } }).project.category).toBe("");
    const empty = coerceDreamSummary(null);
    expect(empty.project.title.value).toBe("");
    expect(empty.project.sdgGoals).toEqual([]);
  });
});

describe("planDreamWrites", () => {
  const s = coerceDreamSummary(raw);

  it("AGENT writes everything proposed; what the user said is VET, the rest ANTAR", () => {
    const w = planDreamWrites(s, "AGENT");
    const find = (e: string, f: string) => w.find((x) => x.entity === e && x.field === f);
    expect(find("project", "title")?.status).toBe("ANTAR");
    expect(find("project", "summary")?.status).toBe("VET");
    expect(find("project", "sdgGoals")?.value).toEqual([3, 10, 11]);
    expect(find("leanCanvas", "problem")?.status).toBe("VET");
    expect(find("leanCanvas", "solution")?.status).toBe("ANTAR");
    expect(find("leanCanvas", "earlyAdopters")).toBeUndefined(); // empty → never written
    expect(find("leanCanvas", "channels")).toBeUndefined();
  });

  it("ASSIST only sets name, summary and description", () => {
    const w = planDreamWrites(s, "ASSIST");
    expect(w.map((x) => `${x.entity}.${x.field}`).sort()).toEqual(["project.description", "project.summary", "project.title"]);
  });
});
