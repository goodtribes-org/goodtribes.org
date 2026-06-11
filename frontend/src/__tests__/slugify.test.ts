import { slugify } from "../lib/slugify";

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces Swedish characters", () => {
    expect(slugify("Rädda Skogssjön")).toBe("radda-skogssjon");
    expect(slugify("Åland")).toBe("aland");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("my org name")).toBe("my-org-name");
  });

  it("collapses multiple spaces and hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
    expect(slugify("hello--world")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugify("hello! world?")).toBe("hello-world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(slugify("  hello  ")).toBe("hello");
  });
});
