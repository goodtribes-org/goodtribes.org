import { canvasBlockStatus } from "../lib/canvasBlockStatus";

describe("canvasBlockStatus", () => {
  it("empty or whitespace is empty, whatever the provenance says", () => {
    expect(canvasBlockStatus(null, "VET")).toBe("empty");
    expect(canvasBlockStatus("  ", "ANTAR")).toBe("empty");
  });
  it("content is an assumption unless marked known — including no provenance row", () => {
    expect(canvasBlockStatus("Föräldrar i Rinkeby", "ANTAR")).toBe("assumed");
    expect(canvasBlockStatus("Föräldrar i Rinkeby", null)).toBe("assumed");
    expect(canvasBlockStatus("Föräldrar i Rinkeby", "VET")).toBe("known");
  });
});
