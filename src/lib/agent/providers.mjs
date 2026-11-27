import { normalizeGeneration, validateProvider } from '@vidoxlabs/seed';

export const DEFAULT_ASSISTANT_NAME = 'Vidoxlabs assistant';

/**
 * Select the provider adapter for this request, following seed's provider
 * seam. The mock provider is the default and what tests and CI use. Cloud
 * providers are used only when the operator opted in with CHAT_ALLOW_CLOUD=1;
 * the opt-in rule is enforced here, not at the call site.
 *
 * @param {Record<string, string>} env
 * @returns {{ provider: any, errors: string[], assistant: string }}
 */
export function selectProvider(env) {
  const name = env.CHAT_PROVIDER === 'openai-compatible' || env.CHAT_PROVIDER === 'gemini' ? env.CHAT_PROVIDER : 'mock';
  const assistant = typeof env.CHAT_ASSISTANT_NAME === 'string' && env.CHAT_ASSISTANT_NAME.trim().length > 0
    ? env.CHAT_ASSISTANT_NAME.trim()
    : DEFAULT_ASSISTANT_NAME;
  const errors = [];
  let provider;
  if (name === 'mock') {
    provider = mockProvider;
  } else {
    if (env.CHAT_ALLOW_CLOUD !== '1') {
      errors.push('cloud providers need CHAT_ALLOW_CLOUD=1');
      provider = mockProvider;
    } else if (!env.CHAT_ENDPOINT || !env.CHAT_API_KEY || !env.CHAT_MODEL) {
      errors.push(`${name} needs CHAT_ENDPOINT, CHAT_API_KEY and CHAT_MODEL`);
      provider = mockProvider;
    } else if (name === 'openai-compatible') {
      provider = openAiCompatibleProvider(env.CHAT_ENDPOINT, env.CHAT_MODEL, env.CHAT_API_KEY);
    } else {
      provider = geminiProvider(env.CHAT_ENDPOINT, env.CHAT_MODEL, env.CHAT_API_KEY);
    }
  }
  const checked = validateProvider(provider);
  if (!checked.ok) errors.push(...checked.errors);
  return { provider, errors, assistant };
}

/**
 * The deterministic provider used by tests, CI and any deployment that has
 * not opted into a cloud model. It answers only from the retrieved packet:
 * no retrieval, no answer; every answer carries its citations.
 *
 * @type {{ name: string, generate: (call: any) => Promise<any> }}
 */
export const mockProvider = {
  name: 'mock',
  async generate(call) {
    const citations = call.citations ?? [];
    const excerpts = call.packet?.items ?? [];
    if (!excerpts.length) {
      return normalizeGeneration({
        text: `I could not find that in the verified documentation corpus, so I will not guess. Ask about Vivarium, its systems, or their current status, or follow the documentation links on this page.`,
        complete: true,
        usage: { input: call.inputChars ?? 0, output: 0, total: call.inputChars ?? 0 }
      });
    }
    const lines = excerpts.slice(0, 5).map((item) => {
      const source = citations.find((citation) => citation.sourceId === item.sourceId);
      const title = source ? source.title : 'a verified page';
      return `${item.text.trim()} (from ${title})`;
    });
    const text = [
      `From the verified documentation:`,
      ...lines,
      citations.length ? `Sources: ${citations.map((citation) => citation.title).join('; ')}.` : ''
    ].filter(Boolean).join('\n');
    return normalizeGeneration({
      text,
      complete: true,
      usage: { input: call.inputChars ?? 0, output: 0, total: call.inputChars ?? 0 }
    });
  }
};

/**
 * An OpenAI-compatible chat-completions adapter. Only the visitor's message
 * and the retrieved public documentation snippets are sent to the endpoint.
 *
 * @param {string} endpoint
 * @param {string} model
 * @param {string} apiKey
 */
export function openAiCompatibleProvider(endpoint, model, apiKey) {
  return {
    name: 'openai-compatible',
    async generate(call) {
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: call.signal,
        body: JSON.stringify({
          model,
          max_tokens: 400,
          messages: [
            { role: 'system', content: call.system },
            { role: 'user', content: call.prompt }
          ]
        })
      });
      if (!response.ok) throw new Error(`the provider endpoint returned ${response.status}`);
      const payload = await response.json();
      const choice = payload.choices?.[0]?.message?.content ?? '';
      return normalizeGeneration({ text: choice, complete: true, model, usage: payload.usage ?? null });
    }
  };
}

/**
 * A Gemini generateContent adapter over the same seam.
 *
 * @param {string} endpoint
 * @param {string} model
 * @param {string} apiKey
 */
export function geminiProvider(endpoint, model, apiKey) {
  return {
    name: 'gemini',
    async generate(call) {
      const base = endpoint.replace(/\/$/, '');
      const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        signal: call.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: call.system }] },
          contents: [{ role: 'user', parts: [{ text: call.prompt }] }],
          generationConfig: { maxOutputTokens: 400 }
        })
      });
      if (!response.ok) throw new Error(`the provider endpoint returned ${response.status}`);
      const payload = await response.json();
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
      return normalizeGeneration({ text, complete: true, model, usage: payload.usageMetadata ?? null });
    }
  };
}
