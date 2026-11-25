import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_LIMITS, originAllowed, validateChatBody } from '../../src/lib/agent/guards.mjs';
import { packetFromHits, searchDocs } from '../../src/lib/agent/retrieval.mjs';
import { chatTools, executeTool } from '../../src/lib/agent/tools.mjs';
import { DEFAULT_ASSISTANT_NAME, mockProvider, selectProvider } from '../../src/lib/agent/providers.mjs';
import { runChatTurn } from '../../src/lib/agent/run.mjs';

test('retrieval returns provenance-labelled hits from the verified corpus', async () => {
  const search = await searchDocs('Vivarium');
  assert.equal(search.ok, true);
  assert.ok(search.count > 0, 'the corpus covers Vivarium');
  const first = search.hits[0];
  assert.match(first.sourceId, /^docs:/);
  assert.match(first.sourceDigest, /^[0-9a-f]{64}$/);
  assert.equal(first.evidenceClass, 'system-metadata');
});

test('context packets stay bounded and cite only admitted sources', async () => {
  const { packet, citations } = packetFromHits((await searchDocs('seed')).hits);
  const total = packet.items.reduce((sum, item) => sum + item.text.length, 0);
  assert.ok(total <= 8_000, 'the packet respects its budget');
  for (const item of packet.items) assert.ok(item.text.length <= 4_000);
  for (const citation of citations) {
    assert.ok(packet.items.some((item) => item.sourceId === citation.sourceId), 'citations reference admitted sources only');
    assert.match(citation.originRef, /^https:\/\/github\.com\/Vidoxlabs\//);
  }
});

test('empty retrieval builds an empty packet, and the mock provider says so', async () => {
  const { packet, citations } = packetFromHits([]);
  assert.equal(packet.items.length, 0);
  assert.equal(citations.length, 0);
  const generation = await mockProvider.generate({ packet, citations: [], inputChars: 10 });
  assert.equal(generation.ok, true);
  assert.match(generation.generation.text, /could not find that in the verified documentation corpus/);
});

test('provider selection enforces the cloud opt-in rule', () => {
  const missingFlag = selectProvider({ CHAT_PROVIDER: 'openai-compatible' });
  assert.equal(missingFlag.provider, mockProvider);
  assert.ok(missingFlag.errors.some((error) => error.includes('CHAT_ALLOW_CLOUD')));

  const missingConfig = selectProvider({ CHAT_PROVIDER: 'gemini', CHAT_ALLOW_CLOUD: '1' });
  assert.equal(missingConfig.provider, mockProvider);
  assert.ok(missingConfig.errors.some((error) => error.includes('CHAT_ENDPOINT')));

  const cloud = selectProvider({ CHAT_PROVIDER: 'openai-compatible', CHAT_ALLOW_CLOUD: '1', CHAT_ENDPOINT: 'https://example.invalid/v1', CHAT_API_KEY: 'test-key', CHAT_MODEL: 'test-model' });
  assert.equal(cloud.provider.name, 'openai-compatible');
  assert.deepEqual(cloud.errors, []);

  const fallback = selectProvider({ CHAT_PROVIDER: 'unexpected' });
  assert.equal(fallback.provider, mockProvider);
});

test('the assistant name defaults and never falls back to another', () => {
  assert.equal(selectProvider({}).assistant, DEFAULT_ASSISTANT_NAME);
  assert.equal(DEFAULT_ASSISTANT_NAME, 'Vidoxlabs assistant');
  assert.equal(selectProvider({ CHAT_ASSISTANT_NAME: 'Site guide' }).assistant, 'Site guide');
});

test('the tool pack validates under the family tool-id grammar', () => {
  assert.equal(chatTools.size, 2);
  assert.ok(chatTools.has('docs.search'));
  assert.ok(chatTools.has('repos.read'));
  assert.equal(chatTools.face('docs.search').effect, 'read');
});

test('tool execution reads only the site corpus and gathered status', async () => {
  const search = await executeTool('docs.search', { query: 'bloom' });
  assert.equal(search.ok, true);
  const status = await executeTool('repos.read', { repository: 'seed' });
  assert.equal(status.ok, true);
  assert.equal(typeof status.result.ciConclusion, 'string');
  assert.equal((await executeTool('repos.read', { repository: 'not-a-repo' })).ok, false);
  assert.equal((await executeTool('docs.nope', {})).ok, false);
});

test('the chat turn plans, calls tools and answers with citations', async () => {
  const turn = await runChatTurn('What is Vivarium?', {});
  assert.equal(turn.assistant, DEFAULT_ASSISTANT_NAME);
  assert.ok(turn.plan.length >= 2);
  assert.ok(turn.toolCalls.some((call) => call.id === 'docs.search'));
  assert.ok(turn.citations.length > 0, 'a Vivarium question finds cited sources');
  const generation = await turn.answer();
  assert.equal(generation.ok, true);
  assert.match(generation.generation.text, /Sources:/);

  const statusTurn = await runChatTurn('What is the current CI state of the systems?', {});
  assert.ok(statusTurn.toolCalls.some((call) => call.id === 'repos.read'));
});

test('the origin guard allows same-origin and configured origins only', () => {
  assert.equal(originAllowed({ origin: null, hostname: 'vidoxlabs.com' }, ''), true);
  assert.equal(originAllowed({ origin: 'https://vidoxlabs.com', hostname: 'vidoxlabs.com' }, ''), true);
  assert.equal(originAllowed({ origin: 'https://elsewhere.example', hostname: 'vidoxlabs.com' }, ''), false);
  assert.equal(originAllowed({ origin: 'https://elsewhere.example', hostname: 'vidoxlabs.com' }, 'https://elsewhere.example'), true);
  assert.equal(originAllowed({ origin: 'not a url', hostname: 'vidoxlabs.com' }, ''), false);
});

test('the body guard enforces size, count and content', () => {
  assert.equal(validateChatBody({ messages: [] }).ok, false);
  assert.equal(validateChatBody({ messages: [{ role: 'visitor', content: 'hi' }] }).ok, true);
  const tooMany = { messages: Array.from({ length: CHAT_LIMITS.MAX_MESSAGES + 1 }, () => ({ role: 'visitor', content: 'hi' })) };
  assert.equal(validateChatBody(tooMany).ok, false);
  const tooLong = { messages: [{ role: 'visitor', content: 'a'.repeat(CHAT_LIMITS.MAX_MESSAGE_CHARS + 1) }] };
  assert.equal(validateChatBody(tooLong).ok, false);
});
