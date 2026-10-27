import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { captureSmallSnapshot, createOperationalBackup, publicKeyId, sealSnapshot } from '../alilab-backup.js';
import { restoreSealedBackup } from '../../scripts/alilab-restore-sealed-backup.mjs';
import { boundPort } from './helpers.mjs';

const pair = generateKeyPairSync('rsa', { modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const token = randomBytes(32).toString('hex');
const env = { ALILAB_BACKUP_ENABLED: '1', ALILAB_BACKUP_SINGLE_WRITER: '1', COACH_DISABLED: '1', MEDIA_UPLOADS: '0',
  ALILAB_BACKUP_PUBLIC_KEY: pair.publicKey, ALILAB_BACKUP_TOKEN_SHA256: createHash('sha256').update(token).digest('hex') };
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alilab-sealed-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const data = path.join(root, 'data'); await fs.mkdir(data);
  await fs.writeFile(path.join(data, 'db.json'), JSON.stringify({ users: [], creds: [], subs: [], invites: [] }));
  await fs.writeFile(path.join(data, 'secret'), 'private-secret-test-only');
  return { root, data };
}
test('sealed backup restores exact bytes, excludes old artifacts, and refuses tampering or the wrong key', async t => {
  const { root, data } = await fixture(t);
  await fs.writeFile(path.join(data, 'state-test.json'), JSON.stringify({ workouts: [{ id: 'w1', sets: [8, 8] }] }));
  await fs.mkdir(path.join(data, '.alilab-backups'));
  await fs.writeFile(path.join(data, '.alilab-backups', 'older.enc'), 'excluded');
  const archive = path.join(root, 'backup.alilab');
  const sealed = sealSnapshot(captureSmallSnapshot(data), pair.publicKey);
  assert.ok(!sealed.includes(Buffer.from('private-secret-test-only')));
  await fs.writeFile(archive, sealed);
  const target = path.join(root, 'restored');
  const m = await restoreSealedBackup(archive, target, pair.privateKey);
  assert.equal(Object.keys(m.files).length, 3);
  for (const name of Object.keys(m.files)) assert.deepEqual(await fs.readFile(path.join(data, name)), await fs.readFile(path.join(target, name)));
  await assert.rejects(fs.access(path.join(target, '.alilab-backups')), { code: 'ENOENT' });
  await assert.rejects(restoreSealedBackup(archive, target, pair.privateKey), /must be empty/);
  const changed = JSON.parse(sealed); changed.keyId = '0'.repeat(64);
  await fs.writeFile(archive, JSON.stringify(changed));
  await assert.rejects(restoreSealedBackup(archive, path.join(root, 'bad-key'), pair.privateKey), /Wrong recovery key/);
  changed.keyId = publicKeyId(pair.publicKey);
  const encrypted = Buffer.from(changed.archive, 'base64'); encrypted[encrypted.length - 1] ^= 1;
  changed.archive = encrypted.toString('base64'); await fs.writeFile(archive, JSON.stringify(changed));
  await assert.rejects(restoreSealedBackup(archive, path.join(root, 'tampered'), pair.privateKey));
  await assert.rejects(fs.access(path.join(root, 'tampered')), { code: 'ENOENT' });
});
test('capture refuses symlinks and limits before exposing an archive', async t => {
  const { root, data } = await fixture(t);
  assert.throws(() => captureSmallSnapshot(data, { maxBytes: 1 }), /limit/);
  assert.throws(() => captureSmallSnapshot(data, { maxFiles: 1 }), /limit/);
  await fs.symlink(path.join(root, 'outside'), path.join(data, 'link'));
  assert.throws(() => captureSmallSnapshot(data), /symlinks/);
});
test('disabled default needs no credentials; enabled exports reject unsupported writers and malformed configuration', () => {
  assert.equal(createOperationalBackup({ env: {} }), null);
  for (const override of [{ COACH_DISABLED: '0' }, { MEDIA_UPLOADS: '1' }, { ALILAB_BACKUP_SINGLE_WRITER: '0' },
    { ALILAB_BACKUP_PUBLIC_KEY: 'bad' }, { ALILAB_BACKUP_TOKEN_SHA256: 'bad' }]) {
    assert.throws(() => createOperationalBackup({ env: { ...env, ...override } }));
  }
});
test('public-key configuration refuses private or mixed PEMs, including encrypted recovery keys', () => {
  const privateKey = createPrivateKey(pair.privateKey);
  for (const pem of [pair.privateKey,
    privateKey.export({ type: 'pkcs1', format: 'pem' }),
    privateKey.export({ type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'fixture-only' }),
    pair.publicKey + pair.privateKey]) {
    assert.throws(() => createOperationalBackup({ env: { ...env, ALILAB_BACKUP_PUBLIC_KEY: pem } }), /public-only PEM/);
  }
  assert.equal(typeof createOperationalBackup({ env: { ...env,
    ALILAB_BACKUP_PUBLIC_KEY: pair.publicKey.replaceAll('\n', '\\n') } }), 'function');
});
async function start(t, data, extra) {
  const child = spawn(process.execPath, ['api/server.js'], { cwd: ROOT, env: { ...process.env,
    PORT: '0', DATA_DIR: data, RP_ID: 'localhost', ORIGIN: 'http://localhost:8080', INVITE_ONLY: '1',
    ALLOW_GUEST: '0', PASSWORD_LOGIN: '0', COACH_DISABLED: '1', MEDIA_UPLOADS: '0', ALILAB_BACKUP_ENABLED: '0', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', c => { log += c }); child.stderr.on('data', c => { log += c });
  t.after(() => child.kill('SIGTERM'));
  return `http://127.0.0.1:${await boundPort(child, () => log)}`;
}
test('real API endpoint is off by default; token grants only sealed export, with no-store and cooldown', async t => {
  const { root, data } = await fixture(t);
  const disabled = await start(t, data, {});
  assert.equal((await fetch(disabled + '/api/ops/backup', { method: 'POST' })).status, 404);
  // A separate directory keeps each fixture an independent, single-writer instance.
  const other = await fixture(t);
  const api = await start(t, other.data, env);
  for (const authorization of ['', 'Bearer ' + 'a'.repeat(64), 'Bearer admin-cookie']) {
    assert.equal((await fetch(api + '/api/ops/backup', { method: 'POST', headers: { authorization } })).status, 401);
  }
  const res = await fetch(api + '/api/ops/backup', { method: 'POST', headers: { authorization: 'Bearer ' + token } });
  assert.equal(res.status, 200); assert.equal(res.headers.get('cache-control'), 'no-store');
  const body = Buffer.from(await res.arrayBuffer());
  assert.equal(createHash('sha256').update(body).digest('hex'), res.headers.get('x-alilab-backup-sha256'));
  const archive = path.join(root, 'api.alilab'); await fs.writeFile(archive, body);
  const restored = path.join(root, 'api-restored');
  const m = await restoreSealedBackup(archive, restored, pair.privateKey);
  assert.ok(m.files.secret && m.files['db.json'] && m.files['vapid.json']);
  assert.equal((await fetch(api + '/api/admin/users', { headers: { authorization: 'Bearer ' + token } })).status, 401);
  assert.equal((await fetch(api + '/api/ops/backup', { method: 'POST', headers: { authorization: 'Bearer ' + token } })).status, 429);
  assert.deepEqual(await fetch(api + '/api/health').then(r => r.json()), { ok: true, users: 0 });
});
