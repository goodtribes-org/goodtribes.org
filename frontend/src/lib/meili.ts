const HOST = process.env.NEXT_PUBLIC_MEILI_HOST ?? "http://localhost:7700";
const KEY =
  process.env.MEILI_MASTER_KEY ?? "changeme-local-dev-key-32chars";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${KEY}`,
};

export async function indexDocuments(
  index: string,
  documents: Record<string, unknown>[]
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
  type: "project" | "idea" | "member";
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

export async function multiSearch(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${HOST}/multi-search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        queries: [
          { indexUid: "projects", q: query, limit: 4 },
          { indexUid: "ideas", q: query, limit: 4 },
          { indexUid: "members", q: query, limit: 3 },
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
