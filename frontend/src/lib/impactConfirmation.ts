import { createHash, randomBytes } from "node:crypto";

// Partnerbekräftelse (#336): a link the team sends to a partner, who
// confirms the project's story without an account. The token is random and
// only its hash is stored, so the database never holds a working link; the
// team sees the link once, when it's made. Pure apart from the crypto.

// How long a link works.
export const CONFIRMATION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export function newConfirmationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: hashConfirmationToken(token) };
}

export function hashConfirmationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// What a token looks like — anything else is rejected before a lookup.
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

export function confirmationExpiry(now: number): Date {
  return new Date(now + CONFIRMATION_DAYS * DAY);
}

export type ConfirmationState = "confirmed" | "revoked" | "expired" | "waiting";

type Row = { confirmedAt: Date | null; revokedAt: Date | null; expiresAt: Date };

// Confirmed wins over everything: a confirmation given stays given.
export function confirmationState(c: Row, now: number): ConfirmationState {
  if (c.confirmedAt) return "confirmed";
  if (c.revokedAt) return "revoked";
  if (c.expiresAt.getTime() <= now) return "expired";
  return "waiting";
}

// Whether a recipient may still confirm through this link.
export function canConfirm(c: Row, now: number): boolean {
  return confirmationState(c, now) === "waiting";
}
