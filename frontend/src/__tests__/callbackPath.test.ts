import { isStartPage, safeCallbackPath } from "@/lib/callbackPath";

const origin = "https://goodtribes.org";

describe("safeCallbackPath", () => {
  it("keeps same-site paths and absolute URLs on this site", () => {
    expect(safeCallbackPath("/sv/projects/new/samtal/abc", origin)).toBe("/sv/projects/new/samtal/abc");
    expect(safeCallbackPath("https://goodtribes.org/sv/projects/new?ai=off", origin)).toBe("/sv/projects/new?ai=off");
  });

  it("treats www and the bare domain as the same site", () => {
    expect(safeCallbackPath("https://www.goodtribes.org/projects/new?guide=x", origin)).toBe("/projects/new?guide=x");
    expect(safeCallbackPath("https://goodtribes.org/projects/new", "https://www.goodtribes.org")).toBe("/projects/new");
    expect(safeCallbackPath("https://www.evil.example/sv", origin)).toBeNull();
    expect(safeCallbackPath("https://wwwgoodtribes.org/sv", origin)).toBeNull();
  });

  it("drops other hosts, protocol-relative links and junk", () => {
    expect(safeCallbackPath("https://evil.example/sv", origin)).toBeNull();
    expect(safeCallbackPath("//evil.example/sv", origin)).toBeNull();
    expect(safeCallbackPath("javascript:alert(1)", origin)).toBeNull();
    expect(safeCallbackPath("", origin)).toBeNull();
    expect(safeCallbackPath(undefined, origin)).toBeNull();
  });
});

describe("isStartPage", () => {
  it.each(["/", "/sv", "/en/", "/sv?x=1"])("treats %s as the start page", (p) => expect(isStartPage(p)).toBe(true));
  it.each(["/sv/projects/new", "/invite/abc"])("does not treat %s as the start page", (p) => expect(isStartPage(p)).toBe(false));
});
