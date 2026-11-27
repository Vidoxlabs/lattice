import statusBundle from '../../data/generated/build-pipeline.json' with { type: 'json' };
import { selectProvider } from './providers.mjs';
import { executeTool } from './tools.mjs';
import { packetFromHits } from './retrieval.mjs';

/**
 * The site's head-agent loop, following bloom's shape (brief, plan, tool
 * calls, answer with citations) as a thin adapter: bloom ships an app rather
 * than a library, so the loop is mirrored here over the family packages.
 *
 * The plan is deterministic from the question shape, because the mock provider
 * and the tool set are the contract this site ships: a status question reads
 * the gathered status, everything else searches the verified corpus first.
 *
 * @param {string} question
 * @param {Record<string, string>} env
 * @returns {Promise<{ assistant: string, plan: string[], toolCalls: any[], citations: any[], answer: () => Promise<any>, providerErrors: string[] }>}
 */
export async function runChatTurn(question, env) {
  const { provider, errors, assistant } = selectProvider(env);
  const plan = [
    'brief: answer only from the verified corpus and the gathered status',
    'search: match the question against the documentation index'
  ];
  const toolCalls = [];
  const isStatusQuestion = /\b(ci|status|state|passing|failing|green)\b/i.test(question);
  if (isStatusQuestion) {
    plan.push('status: read the gathered repository status');
    const focus = Object.keys(statusBundle.status?.repositories ?? {}).find((name) => question.toLowerCase().includes(name)) ?? 'vivarium';
    const statusCall = await executeTool('repos.read', { repository: focus });
    toolCalls.push({
      id: 'repos.read',
      input: { repository: focus },
      ok: statusCall.ok,
      error: statusCall.error,
      summary: statusCall.ok ? `${focus}: ${statusCall.result.ciConclusion} at ${String(statusCall.result.head ?? '').slice(0, 7)}` : statusCall.error
    });
  }
  const searchCall = await executeTool('docs.search', { query: question });
  toolCalls.push({
    id: 'docs.search',
    input: { query: question },
    ok: searchCall.ok,
    error: searchCall.error,
    summary: searchCall.ok ? `${searchCall.result.count} verified pages matched` : searchCall.error
  });
  const hits = searchCall.ok ? searchCall.result.hits : [];

  const { packet, citations } = packetFromHits(hits);
  const excerpts = packet.items ?? [];
  const system = [
    'You answer questions about Vidoxlabs and Vivarium for the public website.',
    'Answer only from the provided documentation excerpts and the gathered repository status.',
    'Every claim keeps its citation. If the excerpts do not answer the question, say so plainly instead of guessing.',
    `The assistant is called ${assistant}.`
  ].join(' ');
  const prompt = [
    question,
    '',
    'Verified documentation excerpts:',
    ...excerpts.map((item) => {
      const citation = citations.find((entry) => entry.sourceId === item.sourceId);
      return `- ${item.text}${citation ? ` [${citation.title}]` : ''}`;
    }),
    toolCalls.length ? `Gathered status: ${toolCalls.map((entry) => entry.summary).join('; ')}` : ''
  ].filter(Boolean).join('\n');

  const answer = () => provider.generate({
    system,
    prompt,
    signal: null,
    packet,
    citations,
    inputChars: prompt.length,
    // The visitor's message and these public excerpts are the only material
    // that ever leaves the site, and only to an opted-in provider.
    notes: errors
  });
  return { assistant, plan, toolCalls, citations, answer, providerErrors: errors };
}
