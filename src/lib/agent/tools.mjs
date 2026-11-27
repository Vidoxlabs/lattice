import { toolFace, toolPack } from '@vidoxlabs/drosera';
import { searchQuestion } from './retrieval.mjs';
import statusBundle from '../../data/generated/build-pipeline.json' with { type: 'json' };

/**
 * The site chat's tool pack, on drosera's tool-face contract and seed's
 * neutral tool-id grammar. Both faces are read-effect: the chat may only
 * read its own verified corpus and the gathered public status.
 */
export const chatTools = toolPack([
  toolFace({
    id: 'docs.search',
    effect: 'read',
    connector: 'lattice-docs-index',
    summary: 'Literal search over the digest-verified documentation corpus. Returns provenance-labelled hits.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 200 } }, required: ['query'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, count: { type: 'number' } }, required: ['ok', 'count'], additionalProperties: false }
  }),
  toolFace({
    id: 'repos.read',
    effect: 'read',
    connector: 'lattice-status',
    summary: 'Read one repository head, CI conclusion and last push from the gathered public status.',
    inputSchema: { type: 'object', properties: { repository: { type: 'string', minLength: 1, maxLength: 40 } }, required: ['repository'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { head: { type: 'string' }, ciConclusion: { type: 'string' } }, required: ['ciConclusion'], additionalProperties: false }
  })
]);

/**
 * Execute one tool face against the site's own data. Unknown ids are refused.
 *
 * @param {string} id
 * @param {{ query?: string, repository?: string }} input
 * @returns {Promise<{ ok: boolean, error?: string, result?: any }>}
 */
export async function executeTool(id, input) {
  if (!chatTools.has(id)) return { ok: false, error: `unknown tool ${id}` };
  if (id === 'docs.search') {
    if (typeof input?.query !== 'string' || input.query.trim().length === 0) {
      return { ok: false, error: 'docs.search needs a non-empty query' };
    }
    const search = await searchQuestion(input.query.trim());
    return { ok: true, result: search };
  }
  if (id === 'repos.read') {
    const repository = statusBundle.status?.repositories?.[String(input?.repository ?? '')];
    if (!repository) return { ok: false, error: 'repository is not in the gathered status' };
    return {
      ok: true,
      result: {
        head: repository.head,
        ciConclusion: repository.ciConclusion,
        lastPushAt: repository.lastPushAt,
        docsFreshness: repository.docsFreshness ?? null,
        gatheredBy: statusBundle.status?.gatheredBy ?? null
      }
    };
  }
  return { ok: false, error: `tool ${id} is not executable here` };
}
