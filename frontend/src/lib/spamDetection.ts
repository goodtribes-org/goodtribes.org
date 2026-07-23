// Deliberately conservative: a false positive immediately hides real
// content (see proactiveModeration.ts), so this only flags a few
// high-confidence signals rather than scoring/weighing many weak ones.
const SPAM_PHRASES = [
  "buy followers",
  "click here now",
  "make money fast",
  "work from home guaranteed",
  "free crypto giveaway",
  "double your bitcoin",
];

const REPEATED_CHAR_RE = /(\S)\1{7,}/;

export function detectSpamSignal(text: string): string | null {
  const linkCount = (text.match(/https?:\/\//g) ?? []).length;
  if (linkCount >= 3) {
    return `Automatiskt: innehåller ${linkCount} länkar`;
  }

  const lower = text.toLowerCase();
  const phraseHit = SPAM_PHRASES.find((phrase) => lower.includes(phrase));
  if (phraseHit) {
    return `Automatiskt: innehåller spamfras ('${phraseHit}')`;
  }

  if (REPEATED_CHAR_RE.test(text)) {
    return "Automatiskt: upprepade tecken";
  }

  return null;
}
