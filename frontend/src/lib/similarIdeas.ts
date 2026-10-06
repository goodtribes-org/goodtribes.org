import { searchIndex } from "@/lib/meili";

export type SimilarIdea = { id: string; title: string };

// "Liknande idéer" (#236): ideas already shared that look like this text, so
// someone can join or build on one instead of starting a duplicate. Plain
// Meilisearch on the ideas index — no AI cost. Meilisearch only weighs the
// first words of a query, so the text is cut to its start. Returns [] when
// search is down or finds nothing; callers just hide the box.
export async function findSimilarIdeas(text: string, opts: { excludeId?: string; locale?: string; limit?: number } = {}): Promise<SimilarIdea[]> {
  const q = text.replace(/\s+/g, " ").trim().split(" ").slice(0, 12).join(" ");
  if (q.length < 3) return [];
  const locale = opts.locale ?? "sv";
  const filter = locale === "sv" ? `locale = "sv"` : `locale IN ["sv", "${locale}"]`;
  const hits = await searchIndex("ideas", q, { limit: (opts.limit ?? 3) + 2, filter });
  const seen = new Set<string>();
  const out: SimilarIdea[] = [];
  for (const h of hits) {
    // Doc ids are "idea-<id>" (plus "__<locale>" for translations).
    const id = h.id.replace(/^idea-/, "").replace(/__.*$/, "");
    if (!id || id === opts.excludeId || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title: h.title });
  }
  return out.slice(0, opts.limit ?? 3);
}
