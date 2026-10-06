// How many drafts (#226) someone may own at the same time. Kept free of
// server imports so Din dröm's client code can show the limit too; the
// rule itself is enforced server-side in createProjectRecord.
export const MAX_DRAFTS = 3;

export type OwnDraft = { slug: string; title: string };
