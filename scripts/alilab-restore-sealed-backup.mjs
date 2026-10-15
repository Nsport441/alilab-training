// Offline restore of an export encrypted to the owner's RSA public key.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPrivateKey, privateDecrypt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publicKeyId } from '../api/alilab-backup.js';
import { decryptBackup } from './alilab-encrypted-backup.mjs';

const decode = value => {
  if (typeof value !== 'string') throw new Error('Invalid envelope');
  const b = Buffer.from(value, 'base64');
  if (b.toString('base64') !== value) throw new Error('Invalid envelope');
  return b;
};
export async function restoreSealedBackup(input, target, privatePem) {
  if ((await fs.stat(input)).size > 48 * 1024 * 1024) throw new Error('Backup too large');
  const envelope = JSON.parse(await fs.readFile(input, 'utf8'));
  if (envelope.format !== 'alilab-sealed-backup' || envelope.version !== 1) throw new Error('Unsupported backup');
  const privateKey = createPrivateKey(privatePem);
  if (envelope.keyId !== publicKeyId(privateKey)) throw new Error('Wrong recovery key');
  const key = privateDecrypt({ key: privateKey, oaepHash: 'sha256' }, decode(envelope.wrappedKey));
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'alilab-sealed-restore-'));
  try {
    const archive = path.join(tmp, 'archive.enc');
    await fs.writeFile(archive, decode(envelope.archive), { flag: 'wx', mode: 0o600 });
    return await decryptBackup(archive, target, key);
  } finally { key.fill(0); await fs.rm(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, target, keyFile, stopped, ...extra] = process.argv.slice(2);
    if (!input || !target || !keyFile || stopped !== '--api-stopped' || extra.length) {
      throw new Error('Usage: node scripts/alilab-restore-sealed-backup.mjs ARCHIVE EMPTY_TARGET PRIVATE_PEM --api-stopped');
    }
    const stat = await fs.lstat(keyFile);
    if (!stat.isFile() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077))) {
      throw new Error('Recovery key must be a private regular file (0600)');
    }
    const pem = await fs.readFile(keyFile);
    try { const m = await restoreSealedBackup(input, target, pem); console.log(`Restored ${Object.keys(m.files).length} files to an independent directory.`); }
    finally { pem.fill(0); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
