export const CATEGORIES = ["Technology", "Environment", "Education", "Arts", "Community", "Health", "Other"];

// Maps the stored English enum value (Project/Organisation.category) to its
// translation key in the "Categories" namespace — CATEGORIES itself stays
// English since it's real stored data, not just UI copy; renaming it would
// require a data migration.
export const CATEGORY_KEYS: Record<string, string> = {
  Technology: "categoryTechnology",
  Environment: "categoryEnvironment",
  Education: "categoryEducation",
  Arts: "categoryArts",
  Community: "categoryCommunity",
  Health: "categoryHealth",
  Other: "categoryOther",
};
