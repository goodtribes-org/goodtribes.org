// Which AI call failures won't go away by trying again: the key is wrong
// or missing, the account can't use the model, the credit is used up, or
// Vertex has no Google credentials. isAiEnabled() only sees that the config
// *exists*; this is how the app learns it doesn't *work*, so the AI parts
// can be hidden for a while (see markAiUnavailable in lib/anthropic.ts)
// instead of answering every message with "Något gick fel". Rate limits,
// overload and timeouts are passing trouble and don't count.
// Pure, so it can be tested without the SDK or Redis.
export function permanentAiFailure(err: unknown): string | null {
  const e = (err ?? {}) as { status?: unknown; message?: unknown };
  const status = typeof e.status === "number" ? e.status : undefined;
  const message = typeof e.message === "string" ? e.message : String(err ?? "");

  if (status === 401) return "authentication";
  if (status === 403) return "permission";
  if (status === 400 && /credit balance/i.test(message)) return "credit";
  if (status === 404 && /model/i.test(message)) return "model_not_found";
  if (/could not load the default credentials|invalid_grant|unauthorized_client|invalid_client/i.test(message)) {
    return "google_credentials";
  }
  return null;
}
