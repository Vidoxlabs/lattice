import { createHash } from 'node:crypto';
import { buildContextPacket, recordSource, searchSources } from '@vidoxlabs/capillary';
import docsIndex from '../../data/docs-index.json' with { type: 'json' };

/** Chat context budgets: bounded and independent of the corpus size. */
export const CHAT_BUDGETS = Object.freeze({ TOTAL: 8_000, PER_ITEM: 4_000, SNIPPET: 160 });

const corpus = (docsIndex.pages ?? []).map((page) => ({
  page,
  sources: page.chunks.map((chunk) => ({
    ...recordSource({
      id: `docs:${page.slug || 'index'}#${chunk.id}`,
      title: page.title,
      digest: createHash('sha256').update(chunk.text).digest('hex'),
      origin: 'repository',
      originRef: `https://github.com/Vidoxlabs/${page.repo === 'docs' ? 'docs' : page.repo}/blob/${page.head ?? 'main'}/${page.sourcePath}`,
      evidenceClass: 'system-metadata',
      confidence: 'direct-tool'
    }),
    text: chunk.text,
    recency: null
  }))
}));

const records = corpus.flatMap((entry) => entry.sources);

/**
 * Literal search over the verified documentation corpus through capillary's
 * retrieval contract. Provenance travels with every hit.
 *
 * @param {string} query
 * @returns {Promise<{ ok: boolean, hits: any[], count: number, error?: any }>}
 */
export async function searchDocs(query) {
  return searchSources({ query, records, snippetChars: CHAT_BUDGETS.SNIPPET });
}

/**
 * Search a natural-language question: capillary's search is literal, so the
 * question fans out into its significant terms, and hits merge by source with
 * summed relevance. The packet and its provenance still come from capillary.
 *
 * @param {string} question
 * @returns {Promise<{ ok: boolean, hits: any[], count: number }>}
 */
export async function searchQuestion(question) {
  const stop = new Set(['what', 'who', 'why', 'how', 'when', 'where', 'the', 'a', 'an', 'is', 'are', 'was', 'do', 'does', 'did', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'its', 'their', 'current', 'state', 'can', 'you', 'your', 'site', 'please']);
  const terms = [...new Set(question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2 && !stop.has(term)))].slice(0, 8);
  if (!terms.length) return { ok: true, hits: [], count: 0 };
  const merged = new Map();
  for (const term of terms) {
    const result = await searchDocs(term);
    if (!result.ok) continue;
    for (const hit of result.hits) {
      const existing = merged.get(hit.sourceId);
      if (existing) existing.relevance += hit.relevance;
      else merged.set(hit.sourceId, { ...hit });
    }
  }
  const hits = [...merged.values()].sort((a, b) => b.relevance - a.relevance).slice(0, 8);
  return { ok: true, hits, count: hits.length };
}

/**
 * Build a bounded, provenance-labelled context packet from search hits, in
 * relevance order, with the packet contract's budgets.
 *
 * @param {any[]} hits
 * @returns {{ packet: any, citations: { sourceId: string, title: string, originRef: string }[] }}
 */
export function packetFromHits(hits) {
  const items = hits.map((hit, index) => ({
    id: `chat-hit-${index}`,
    sourceId: hit.sourceId,
    sourceDigest: hit.sourceDigest,
    text: hit.snippet ?? '',
    relevance: hit.relevance,
    recency: hit.recency ?? null
  }));
  const packet = buildContextPacket({
    items,
    totalBudget: CHAT_BUDGETS.TOTAL,
    perItemBudget: CHAT_BUDGETS.PER_ITEM
  });
  const byId = new Map(records.map((record) => [record.id, record]));
  const citations = [...new Set((packet.items ?? []).map((item) => item.sourceId))].map((sourceId) => {
    const record = byId.get(sourceId);
    return { sourceId, title: record.title, originRef: record.originRef };
  });
  return { packet, citations };
}
