jest.mock("../lib/prisma", () => ({ prisma: {} }));

import { decideAiPlacement } from "../lib/aiSuggestions";

describe("decideAiPlacement — write only in AGENT, and never over a human", () => {
  it("AGENT writes into empty fields and over its own untouched draft", () => {
    expect(decideAiPlacement("AGENT", null, null)).toBe("write");
    expect(decideAiPlacement("AGENT", "gammalt AI-utkast", { author: "AI", status: "ANTAR" })).toBe("write");
  });

  it("AGENT suggests instead of touching human text or an edited draft", () => {
    expect(decideAiPlacement("AGENT", "mitt eget", { author: "USER", status: "VET" })).toBe("suggest");
    expect(decideAiPlacement("AGENT", "redigerat", { author: "AI_EDITED", status: "ANTAR" })).toBe("suggest");
    expect(decideAiPlacement("AGENT", "text från före märkningen", null)).toBe("suggest");
  });

  it("ASSIST never writes — not even into an empty field", () => {
    expect(decideAiPlacement("ASSIST", null, null)).toBe("suggest");
    expect(decideAiPlacement("ASSIST", "AI-utkast", { author: "AI", status: "ANTAR" })).toBe("suggest");
  });
});
