// Friction against farming first tasks for tokens (#294): an account younger
// than NEW_ACCOUNT_DAYS can have at most NEW_ACCOUNT_MAX_OPEN first tasks
// going at once — sign-ups waiting plus tasks taken and not yet done — and
// leads see "Nytt konto" next to its sign-ups. Tokens themselves are
// untouched. Pure, so client components can use it too; the database side
// is atNewAccountCap in lib/firstTasks.ts.

export const NEW_ACCOUNT_DAYS = 7;
export const NEW_ACCOUNT_MAX_OPEN = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function accountAgeDays(createdAt: Date, now = new Date()): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
}

export function isNewAccount(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < NEW_ACCOUNT_DAYS * DAY_MS;
}

export function newAccountCapReached(createdAt: Date, openCount: number, now = new Date()): boolean {
  return isNewAccount(createdAt, now) && openCount >= NEW_ACCOUNT_MAX_OPEN;
}
