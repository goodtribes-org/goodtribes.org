import { hasVoice, impactStepsDone, storyTemplate, trustLevel } from "../lib/impactStory";

const none = { followup: null, deliveredReports: 0, verifiedDeliveredReports: 0 };

describe("the trust ladder (#334)", () => {
  it("climbs with what the project has, and nothing is required", () => {
    expect(trustLevel(none)).toBe(0);
    expect(trustLevel({ ...none, followup: { story: "Vi gick promenader." } })).toBe(1);
    expect(trustLevel({ ...none, followup: { story: "x", voiceQuote: "Det betyder allt", voiceConsent: true } })).toBe(2);
    expect(trustLevel({ ...none, followup: { externalVerificationNotes: "Kyrkans diakon har följt det" } })).toBe(3);
    expect(trustLevel({ ...none, verifiedDeliveredReports: 1 })).toBe(4);
  });
  it("a voice without consent doesn't count and isn't shown", () => {
    expect(hasVoice({ voiceQuote: "Det betyder allt", voiceConsent: false })).toBe(false);
    expect(trustLevel({ ...none, followup: { story: "x", voiceQuote: "Det betyder allt", voiceConsent: false } })).toBe(1);
  });
});

describe("Impact steps (#334)", () => {
  it("each step follows its own data", () => {
    const steps = impactStepsDone({
      followup: { story: "x", voiceQuote: "y", voiceConsent: true, externalVerificationNotes: "z", storySharedAt: new Date(), nextStepDecision: "CONTINUE" },
      deliveredReports: 0,
      verifiedDeliveredReports: 0,
    });
    expect(Object.values(steps).every(Boolean)).toBe(true);
    expect(impactStepsDone({ ...none, followup: { nextStepDecision: "UNDECIDED" } }).next_step_decided).toBe(false);
  });
});

describe("the story's start without AI", () => {
  const t = { did: "Vad vi gjorde:", numbers: "Det här hände:", meant: "Vad det betydde:", next: "Vad vi gör nu:", cumulative: "totalt sedan start", atLeast: "minst", approx: "ca", moments: "Månad för månad:" };
  it("lists the figures exactly as reported, never summed", () => {
    const text = storyTemplate(
      t,
      [{ label: "Promenadpar", unit: "par", currentValue: 7, updates: 2 }, { label: "Ej rapporterat", unit: "st", currentValue: 0, updates: 0 }],
      [
        { metricDescription: "Datorer", metricValue: 25000, metricUnit: "st", valueQualifier: "AT_LEAST", isCumulative: true },
        { metricDescription: "Datorer 2025", metricValue: 3200, metricUnit: "st", valueQualifier: "EXACT", isCumulative: false },
      ],
    );
    expect(text).toContain("- Promenadpar: 7 par");
    expect(text).not.toContain("Ej rapporterat");
    expect(text).toContain("- Datorer: minst 25000 st (totalt sedan start)");
    expect(text).toContain("- Datorer 2025: 3200 st");
    expect(text).not.toContain("28200");
  });
  it("puts the team's monthly pulse sentences in, only when there are any", () => {
    expect(storyTemplate(t, [], [])).not.toContain("Månad för månad");
    const text = storyTemplate(t, [], [], ["september 2026: Första båten i sjön", "oktober 2026: Tolv barn kom"]);
    expect(text).toContain("Månad för månad:\n- september 2026: Första båten i sjön\n- oktober 2026: Tolv barn kom");
    expect(text.indexOf("Månad för månad")).toBeLessThan(text.indexOf("Vad det betydde"));
  });
});
