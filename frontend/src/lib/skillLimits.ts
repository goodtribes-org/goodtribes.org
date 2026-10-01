// Limits for free-text skill names, shared by the server (lib/skills.ts) and
// client forms — kept apart from lib/skills.ts so a client component can
// import them without pulling in the Prisma client.

// Longest skill name accepted from a free-text field, and the most new skills
// one project save may create — keeps a single form post from flooding the
// shared skill catalogue.
export const MAX_SKILL_NAME_LENGTH = 60;
export const MAX_NEW_SKILLS_PER_SAVE = 10;
