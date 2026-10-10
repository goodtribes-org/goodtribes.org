import { isOpenFirstTask, offersFull, parseFirstTaskFields, parseFirstTaskFilters } from "../lib/firstTasks";

describe("parseFirstTaskFields", () => {
  it("keeps known values, trims text and drops the rest", () => {
    expect(
      parseFirstTaskFields({ why: "  Vi behöver höra äldre  ", time: "HOURS2_4", place: " Hässelby ", choose: true, question: " Har du pratat med äldre? ", maxOffers: 3 }),
    ).toEqual({ why: "Vi behöver höra äldre", time: "HOURS2_4", place: "Hässelby", choose: true, question: "Har du pratat med äldre?", maxOffers: 3 });
  });

  it("ignores a question and a cap unless the leads choose", () => {
    expect(parseFirstTaskFields({ choose: false, question: "Q?", maxOffers: 3 })).toMatchObject({ choose: false, question: null, maxOffers: null });
  });

  it("rejects unknown times, empty text and silly caps", () => {
    expect(parseFirstTaskFields({ time: "FOREVER", why: "   ", place: "", choose: true, maxOffers: -2 })).toEqual({
      why: null, time: null, place: null, choose: true, question: null, maxOffers: null,
    });
    expect(parseFirstTaskFields({ choose: true, maxOffers: 999 }).maxOffers).toBe(50);
    expect(parseFirstTaskFields(null)).toMatchObject({ choose: false, time: null });
  });
});

describe("isOpenFirstTask", () => {
  const base = { openToPublic: true, assigneeId: null, column: "TODO", source: "manual" };
  it("is open only while nobody has it, it isn't done and it isn't a GitHub mirror", () => {
    expect(isOpenFirstTask(base)).toBe(true);
    expect(isOpenFirstTask({ ...base, openToPublic: false })).toBe(false);
    expect(isOpenFirstTask({ ...base, assigneeId: "u1" })).toBe(false);
    expect(isOpenFirstTask({ ...base, column: "DONE" })).toBe(false);
    expect(isOpenFirstTask({ ...base, source: "github" })).toBe(false);
  });
});

describe("offersFull", () => {
  it("only fills up when the leads choose and set a cap", () => {
    expect(offersFull({ firstTaskChoose: true, firstTaskMaxOffers: 3 }, 3)).toBe(true);
    expect(offersFull({ firstTaskChoose: true, firstTaskMaxOffers: 3 }, 2)).toBe(false);
    expect(offersFull({ firstTaskChoose: true, firstTaskMaxOffers: null }, 50)).toBe(false);
    expect(offersFull({ firstTaskChoose: false, firstTaskMaxOffers: 1 }, 5)).toBe(false);
  });
});

describe("parseFirstTaskFilters", () => {
  it("keeps known filter values from the URL", () => {
    expect(parseFirstTaskFilters({ q: "  Gottsunda ", sdg: "4", form: "commercial", phase: "PILOT", time: "short", place: "onsite" })).toEqual({
      q: "Gottsunda", sdg: 4, form: "commercial", phase: "PILOT", time: "short", place: "onsite",
    });
  });

  it("drops unknown or malformed values", () => {
    expect(parseFirstTaskFilters({ q: "   ", sdg: "18", form: "x", phase: "SPRINT", time: ["short"], place: "moon" })).toEqual({
      q: null, sdg: null, form: null, phase: null, time: null, place: null,
    });
  });
});
