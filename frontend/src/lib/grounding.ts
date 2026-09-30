// "Hitta aldrig på fakta", enforced rather than trusted: a point that names
// an organisation, tool or person not found in what the Critic was given is
// dropped. The model lists its own names (the prompt asks it to); a name
// counts as found if it appears in the source text, ignoring case.
export function namesAreGrounded(names: unknown, source: string): boolean {
  if (!Array.isArray(names)) return true;
  const haystack = source.toLowerCase();
  return names.every((n) => typeof n !== "string" || !n.trim() || haystack.includes(n.trim().toLowerCase()));
}
