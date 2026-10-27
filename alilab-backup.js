// Optional encrypted exports for a small, single-writer AliLab pilot.
// Capture is synchronous in the API event loop: no handler/timer can write midway.
// It does NOT coordinate other processes, rolling deployments or external writers.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, createPublicKey, publicEncrypt, randomBytes, createCipheriv, timingSafeEqual } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const MAGIC = Buffer.from('ALILAB-BACKUP-1\n');
const MAX_BYTES = 16 * 1024 * 1024;
const MAX_FILES = 512;
const yes = value => /^(1|true|yes|on)$/i.test(value || '');
const sha = value => createHash('sha256').update(value).digest('hex');
export const publicKeyId = key => sha((key?.type === 'public' ? key : createPublicKey(key)).export({ type: 'spki', format: 'der' }));

export function captureSmallSnapshot(dataDir, { maxBytes = MAX_BYTES, maxFiles = MAX_FILES } = {}) {
  const root = path.resolve(dataDir), files = Object.create(null), hashes = Object.create(null);
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Data root must be a regular directory');
  let bytes = 0;
  function walk(prefix = '') {
    if (prefix.split('/').length > 32) throw new Error('Snapshot nesting limit exceeded');
    for (const name of fs.readdirSync(path.join(root, prefix)).sort()) {
      if (name.includes('\\') || name === '.' || name === '..') throw new Error('Unsafe data path');
      const relative = prefix ? `${prefix}/${name}` : name;
      const absolute = path.join(root, relative), stat = fs.lstatSync(absolute);
      if (relative === '.alilab-backups') {
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Invalid backup artifact directory');
        continue;
      }
      if (stat.isDirectory() && !stat.isSymbolicLink()) { walk(relative); continue; }
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Snapshot refuses special files and symlinks');
      if (Object.keys(files).length >= maxFiles || bytes + stat.size > maxBytes) throw new Error('Snapshot limit exceeded');
      const fd = fs.openSync(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      let body;
      try {
        const opened = fs.fstatSync(fd);
        if (!opened.isFile() || opened.size > maxBytes - bytes) throw new Error('Snapshot limit exceeded');
        body = Buffer.alloc(opened.size);
        let offset = 0;
        while (offset < body.length) {
          const n = fs.readSync(fd, body, offset, body.length - offset, offset);
          if (!n) throw new Error('Data changed during capture');
          offset += n;
        }
        const after = fs.fstatSync(fd);
        if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) throw new Error('Data changed during capture');
      } finally { fs.closeSync(fd); }
      bytes += body.length;
      files[relative] = body.toString('base64');
      hashes[relative] = sha(body);
    }
  }
  walk();
  if (!Object.hasOwn(files, 'db.json') || !Object.hasOwn(files, 'secret')) throw new Error('Uninitialized API data');
  return { files, manifest: { format: 1, created: new Date().toISOString(),
    build: process.env.APP_BUILD || 'unspecified', excludedPaths: ['.alilab-backups'], files: hashes } };
}

export function sealSnapshot(snapshot, publicKey) {
  const key = randomBytes(32);
  try {
    const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(MAGIC);
    const compressed = deflateSync(Buffer.from(JSON.stringify(snapshot)));
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const archive = Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), encrypted]);
    return Buffer.from(JSON.stringify({ format: 'alilab-sealed-backup', version: 1,
      keyId: publicKeyId(publicKey), wrappedKey: publicEncrypt({ key: publicKey, oaepHash: 'sha256' }, key).toString('base64'),
      archive: archive.toString('base64') }));
  } finally { key.fill(0); }
}

export function createOperationalBackup({ dataDir, env = process.env, now = Date.now } = {}) {
  if (!yes(env.ALILAB_BACKUP_ENABLED)) return null;
  // Synchronous capture is only supported with this pilot's other writers disabled.
  if (!yes(env.ALILAB_BACKUP_SINGLE_WRITER) || !yes(env.COACH_DISABLED) || !/^(0|false|no|off)$/i.test(env.MEDIA_UPLOADS || '')) {
    throw new Error('Operational backup requires one API writer, disabled Coach and disabled uploads');
  }
  if (!/^[a-f0-9]{64}$/.test(env.ALILAB_BACKUP_TOKEN_SHA256 || '')) throw new Error('Invalid backup token hash');
  const expected = Buffer.from(env.ALILAB_BACKUP_TOKEN_SHA256, 'hex');
  const publicPem = (env.ALILAB_BACKUP_PUBLIC_KEY || '').replaceAll('\\n', '\n').trim();
  // createPublicKey also accepts private PEMs. Require exactly one public-only PEM
  // so a mistaken recovery-key paste cannot silently persist private material here.
  if (!/^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY)-----\r?\n[A-Za-z0-9+/=\r\n]+-----END \1-----$/.test(publicPem)) {
    throw new Error('Backup public-key setting requires a public-only PEM');
  }
  const publicKey = createPublicKey(publicPem);
  if (publicKey.asymmetricKeyType !== 'rsa' || publicKey.asymmetricKeyDetails.modulusLength < 3072) {
    throw new Error('Backup requires an RSA public key of at least 3072 bits');
  }
  const keyId = publicKeyId(publicKey);
  let next = 0;
  return (req, res) => {
    const refuse = (status, message, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
      res.end(JSON.stringify({ error: message }));
    };
    const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
    if (!token || !timingSafeEqual(createHash('sha256').update(token).digest(), expected)) return refuse(401, 'Unauthorized');
    if (now() < next) return refuse(429, 'Backup cooldown', { 'Retry-After': String(Math.ceil((next - now()) / 1000)) });
    // No await from the first readdir through the final read: capture completes in one event-loop turn.
    let snapshot;
    try { snapshot = captureSmallSnapshot(dataDir); }
    catch { return refuse(503, 'Backup unavailable; inspect data limits and writer configuration'); }
    const body = sealSnapshot(snapshot, publicKey);
    next = now() + 60 * 60 * 1000;
    const stamp = new Date(now()).toISOString().replaceAll(':', '-');
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': body.length,
      'Content-Disposition': `attachment; filename="AliLab-Training-${stamp}.alilab"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-AliLab-Backup-Sha256': sha(body), 'X-AliLab-Backup-Key-Id': keyId });
    res.end(body);
  };
}
