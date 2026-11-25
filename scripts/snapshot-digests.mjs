import { createHash } from 'node:crypto';

/**
 * The committed snapshot stores the site's published text, which carries the
 * neutral-vocabulary mapping applied in the content pipeline. Its manifest
 * therefore records the digest of each stored text rather than of the upstream
 * bytes, so a build with no network still verifies the snapshot against its own
 * manifest and renders it instead of placeholders. A record whose text is not
 * stored in the snapshot keeps its upstream digest.
 *
 * The live manifest a normal build fetches keeps the upstream digests; only the
 * snapshot copy is recomputed, and this is the only place that does it.
 *
 * @param {any} snapshot the collected pipeline output, as the snapshot stores it
 * @returns {any} the same object, with the stored texts' digests recomputed
 */
export function recomputeStoredDigests(snapshot) {
  const stored = new Map();
  for (const [path, text] of Object.entries(snapshot.documents ?? {})) {
    const match = /^sources\/([^/]+)\/(.+)$/.exec(path);
    if (match) stored.set(`${match[1]}\u0000${match[2]}`, text);
  }
  for (const page of snapshot.docsPages ?? []) {
    if (page.kind !== 'placeholder' && typeof page.body === 'string') {
      stored.set(`${page.repo}\u0000${page.sourcePath}`, page.body);
    }
  }
  for (const [name, source] of Object.entries(snapshot.manifest?.sources ?? {})) {
    for (const record of source.files ?? []) {
      const text = stored.get(`${source.name ?? name}\u0000${record.path}`);
      if (typeof text === 'string') record.sha256 = createHash('sha256').update(text).digest('hex');
    }
  }
  return snapshot;
}
