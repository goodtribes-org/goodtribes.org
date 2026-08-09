const HOST = process.env.NEXT_PUBLIC_MEILI_HOST ?? "http://localhost:7700";
const KEY =
  process.env.MEILI_MASTER_KEY ?? "changeme-local-dev-key-32chars";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${KEY}`,
};

export async function indexDocuments(
  index: string,
  documents: object[]
) {
  try {
    await fetch(`${HOST}/indexes/${index}/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify(documents),
    });
  } catch {
    // Best-effort — don't block the main flow if Meilisearch is unavailable
  }
}

export interface SearchResult {
  id: string;
  type: "project" | "idea" | "member" | "org";
  title: string;
  description?: string;
  url: string;
  locale?: string;
}

// Registers `locale` as filterable on the projects/ideas indexes so
// multiSearch() can filter by it. Settings apply retroactively and PATCHing
// is idempotent, so this is safe to call on every sync rather than gating it
// behind a one-time setup step like the messages index below.
export async function ensureLocaleFilterable(index: "projects" | "ideas") {
  try {
    await fetch(`${HOST}/indexes/${index}/settings`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ filterableAttributes: ["locale"] }),
    });
  } catch {
    // Best-effort — same fallback stance as indexDocuments
  }
}

export async function deleteDocument(index: string, id: string) {
  try {
    await fetch(`${HOST}/indexes/${index}/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });
  } catch { }
}

export interface MessageDoc {
  id: string;
  roomId: string;
  body: string;
  authorName: string;
  createdAt: number;
}

// Unlike projects/ideas/members (searched with a public key, no filter),
// chat messages must never be readable outside the rooms the searching user
// actually belongs to — filterableAttributes has to be configured before a
// `filter` query works at all. Configured lazily (once per server process)
// on first index write rather than via a separate setup step, since nothing
// else in this app runs one-off Meilisearch provisioning.
//
// The index is also created explicitly with an explicit primaryKey: letting
// Meilisearch auto-create it from the first document fails outright here,
// since `id` and `roomId` both end in "id" and it refuses to guess between
// them ("index_primary_key_multiple_candidates_found"). This creation must
// be *awaited* by every caller (not fire-and-forget) — Meilisearch processes
// each index's task queue in enqueue order, so if the document-add request
// so much as starts before the index-creation request is enqueued, it wins
// the race, auto-creates the index itself, and hits the same error.
let indexCreatedPromise: Promise<void> | null = null;
function ensureMessagesIndexCreated(): Promise<void> {
  if (!indexCreatedPromise) {
    indexCreatedPromise = fetch(`${HOST}/indexes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ uid: "messages", primaryKey: "id" }),
    })
      .then(() => {
        // Settings apply retroactively too, so this doesn't need to block
        // document writes the way index creation does.
        fetch(`${HOST}/indexes/messages/settings`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            filterableAttributes: ["roomId"],
            sortableAttributes: ["createdAt"],
            searchableAttributes: ["body"],
          }),
        }).catch(() => {});
      })
      .catch(() => {});
  }
  return indexCreatedPromise;
}

export async function indexMessage(doc: MessageDoc) {
  await ensureMessagesIndexCreated();
  return indexDocuments("messages", [doc]);
}

// roomIds is computed live by the caller from current room membership (see
// getSearchableRoomIds in rooms.ts) rather than denormalized into the
// index at write time — membership can change (e.g. leaving a project), and
// a stale per-document ACL snapshot would let removed members keep finding
// messages via search after losing access everywhere else.
export async function searchMessages(query: string, roomIds: string[]): Promise<MessageDoc[]> {
  if (!query.trim() || roomIds.length === 0) return [];
  try {
    const filter = `roomId IN [${roomIds.map((id) => JSON.stringify(id)).join(", ")}]`;
    const res = await fetch(`${HOST}/indexes/messages/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ q: query, filter, sort: ["createdAt:desc"], limit: 20 }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: MessageDoc[] };
    return data.hits ?? [];
  } catch {
    return [];
  }
}

// Projects/ideas docs are locale-partitioned (see ensureLocaleFilterable +
// meili-sync's route.ts) — a translated project/idea has both an `sv` doc
// (bare id) and an `__en`-suffixed doc. Filtering for `locale IN [sv, wanted]`
// and then, per base id (id with any "__en" suffix stripped), preferring the
// wanted-locale hit over the sv one gives "translated if available, sv
// fallback otherwise" — same fallback idiom used on the read side.
function dedupeByLocale(hits: SearchResult[], locale: string): SearchResult[] {
  const byBaseId = new Map<string, SearchResult>();
  for (const hit of hits) {
    const baseId = hit.id.endsWith("__en") ? hit.id.slice(0, -4) : hit.id;
    const existing = byBaseId.get(baseId);
    if (!existing || hit.locale === locale) byBaseId.set(baseId, hit);
  }
  return [...byBaseId.values()];
}

export async function multiSearch(query: string, locale: string = "sv"): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  // Always scope projects/ideas to sv plus (if different) the requested
  // locale — without this, an `sv` search would also surface every other
  // locale's doc unfiltered (e.g. a translated project's `:en`-suffixed doc
  // leaking into a Swedish search), since a missing filter means "no
  // locale restriction at all", not "sv only".
  const localeFilter = locale === "sv" ? `locale = "sv"` : `locale IN ["sv", "${locale}"]`;
  try {
    const res = await fetch(`${HOST}/multi-search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        queries: [
          { indexUid: "projects", q: query, limit: 8, filter: localeFilter },
          { indexUid: "ideas",    q: query, limit: 6, filter: localeFilter },
          { indexUid: "orgs",     q: query, limit: 3 },
          { indexUid: "members",  q: query, limit: 3 },
        ],
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { hits?: SearchResult[] }[];
    };
    const allHits = (data.results ?? []).flatMap((r) => r.hits ?? []);
    return dedupeByLocale(allHits, locale);
  } catch {
    return [];
  }
}
