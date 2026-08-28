import {
  CATEGORY_META,
  CATEGORY_LABEL_KEYS,
  CATEGORY_ORDER,
  isValidCategory,
} from "../lib/kanbanCategories";

describe("kanbanCategories", () => {
  it("defines the same set of category keys across META, LABEL_KEYS, and ORDER", () => {
    const metaKeys = Object.keys(CATEGORY_META).sort();
    const labelKeys = Object.keys(CATEGORY_LABEL_KEYS).sort();
    expect(labelKeys).toEqual(metaKeys);
    expect([...CATEGORY_ORDER].sort()).toEqual(metaKeys);
  });

  it("gives every category a label, background class, text class, and hex color", () => {
    for (const key of CATEGORY_ORDER) {
      const meta = CATEGORY_META[key];
      expect(meta.label).toEqual(expect.any(String));
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.bg).toMatch(/^bg-/);
      expect(meta.text).toMatch(/^text-/);
      expect(meta.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("preserves declaration order in CATEGORY_ORDER", () => {
    expect(CATEGORY_ORDER).toEqual([
      "teknik",
      "design",
      "ekonomi",
      "strategi",
      "administration",
      "community",
    ]);
  });

  it("maps every category to a distinct next-intl translation key", () => {
    const values = Object.values(CATEGORY_LABEL_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("isValidCategory accepts every known category key", () => {
    for (const key of CATEGORY_ORDER) {
      expect(isValidCategory(key)).toBe(true);
    }
  });

  it("isValidCategory rejects unknown values", () => {
    expect(isValidCategory("not-a-category")).toBe(false);
    expect(isValidCategory("")).toBe(false);
  });

  it("isValidCategory is case-sensitive", () => {
    expect(isValidCategory("Teknik")).toBe(false);
    expect(isValidCategory("TEKNIK")).toBe(false);
  });
});
