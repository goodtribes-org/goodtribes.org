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

export async function multiSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${HOST}/multi-search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        queries: [
          { indexUid: "projects", q: query, limit: 4 },
          { indexUid: "ideas",    q: query, limit: 3 },
          { indexUid: "orgs",     q: query, limit: 3 },
          { indexUid: "members",  q: query, limit: 3 },
        ],
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { hits?: SearchResult[] }[];
    };
    return (data.results ?? []).flatMap((r) => r.hits ?? []);
  } catch {
    return [];
  }
}
