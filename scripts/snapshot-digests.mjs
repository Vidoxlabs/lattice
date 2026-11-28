import { createHash } from 'node:crypto';

/**
 * Stamp the digest of each stored text onto its manifest record, without
 * touching the upstream digest. The committed snapshot stores the site's
 * published text, which carries the neutral-vocabulary mapping applied in the
 * content pipeline, so a record that has stored text gains `storedSha256`, the
 * digest of that stored text. `sha256` stays the upstream digest the record
 * verified against at capture time. A build with no network verifies the
 * snapshot text against `storedSha256`; a build whose manifest came in live
 * additionally requires the snapshot's upstream digest to still match, which
 * is what keeps a stale snapshot from passing for moved upstream text.
 *
 * A record whose text is not stored in the snapshot keeps only its upstream
 * digest. The live manifest a normal build fetches never carries
 * `storedSha256`; only the snapshot copy is stamped, and this is the only
 * place that stamps it.
 *
 * @param {any} snapshot the collected pipeline output, as the snapshot stores it
 * @returns {any} the same object, with the stored texts' digests stamped on
 */
export function stampStoredDigests(snapshot) {
  const stored = new Map();
  for (const [path, entry] of Object.entries(snapshot.documents ?? {})) {
    const match = /^sources\/([^/]+)\/(.+)$/.exec(path);
    // A document written before the recorded results carried plain strings;
    // a later one carries the result next to the text.
    const text = typeof entry === 'string' ? entry : entry?.text ?? null;
    if (match && typeof text === 'string') stored.set(`${match[1]}\u0000${match[2]}`, text);
  }
  for (const page of snapshot.docsPages ?? []) {
    if (page.kind !== 'placeholder' && typeof page.body === 'string') {
      stored.set(`${page.repo}\u0000${page.sourcePath}`, page.body);
    }
  }
  for (const [name, source] of Object.entries(snapshot.manifest?.sources ?? {})) {
    for (const record of source.files ?? []) {
      const text = stored.get(`${source.name ?? name}\u0000${record.path}`);
      if (typeof text === 'string') record.storedSha256 = createHash('sha256').update(text).digest('hex');
    }
  }
  return snapshot;
}

/**
 * Assemble the snapshot object the refresh writes: a deep copy of the
 * collected pipeline with the capture time added and the stored digests
 * stamped on the copy. The copy is what keeps the collected pipeline — whose
 * manifest carries the upstream digests and which other outputs are written
 * from — untouched by the stamping.
 *
 * @param {any} pipeline the collected pipeline output
 * @param {string} capturedAt the refresh time, as the snapshot records it
 * @returns {any} the snapshot object to write
 */
export function buildSnapshot(pipeline, capturedAt) {
  return stampStoredDigests(structuredClone({ ...pipeline, capturedAt }));
}
