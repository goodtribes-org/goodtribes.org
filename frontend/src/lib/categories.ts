export const CATEGORIES = ["Technology", "Environment", "Education", "Arts", "Community", "Health", "Other"];

// Display-only Swedish labels — CATEGORIES itself stays English since it's
// the actual stored value on Project/Organisation/Idea rows, not just UI
// copy; renaming it would require a data migration.
export const CATEGORY_LABELS: Record<string, string> = {
  Technology: "Teknik",
  Environment: "Miljö",
  Education: "Utbildning",
  Arts: "Kultur",
  Community: "Community",
  Health: "Hälsa",
  Other: "Övrigt",
};
