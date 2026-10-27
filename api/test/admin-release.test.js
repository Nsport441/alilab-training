import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReleaseReader, deploymentEvidence, compare } from '../admin-release.js';

test('GitHub failures never become a deployed version and requests are cached', async () => {
  let calls = 0;
  const read = createReleaseReader({ env: {}, fetcher: async () => { calls++; throw Error('private'); } });
  const results = await Promise.all([read(), read()]);
  assert.equal(calls, 1);
  assert.equal(results[0].github.commit, null);
  assert.equal(results[0].deployed, null);
  assert.equal(results[0].comparisons.githubApi, 'unknown');
  await read(); assert.equal(calls, 1);
});
test('strict identities and source provenance, independent deployment fields', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'evidence.json');
  const a = 'a'.repeat(40), b = 'b'.repeat(40);
  fs.writeFileSync(file, JSON.stringify({ provider: 'runflare', observedAt: '2026-10-27T08:00:00Z', source: 'https://runflare.com/example',
    api: { commit: a, image: 'latest', status: 'success', deployedAt: 'bad', token: 'secret' }, web: { commit: b } }));
  const read = createReleaseReader({ env: { RELEASE_EVIDENCE_FILE: file }, fetcher: async () => ({ ok: true, json: async () => ({ sha: a }) }) });
  const r = await read();
  assert.equal(r.comparisons.githubApi, 'same');
  assert.equal(r.comparisons.githubWeb, 'different');
  assert.equal(r.comparisons.runtimeApi, 'unknown');
  assert.equal(r.deployed.api.image, null);
  assert.equal(r.deployed.api.status, 'unknown');
  assert.equal(r.deployed.api.deployedAt, null);
  assert.equal(JSON.stringify(r).includes('secret'), false);
  fs.writeFileSync(file, '{}'); assert.equal(deploymentEvidence(file), null);
  assert.equal(compare(null, a), 'unknown');
});
