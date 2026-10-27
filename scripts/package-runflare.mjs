// Export committed sources only. Never read local .env, runtime data or credentials.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const git = (...args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const sha = git('rev-parse', '--verify', `${process.argv[2] || 'HEAD'}^{commit}`).toString().trim();
const out = resolve(process.argv[3] || 'artifacts/runflare');
mkdirSync(out, { recursive: true });
const manifest = { commit: sha, services: {} };
for (const service of ['api', 'web']) {
  const stage = mkdtempSync(join(tmpdir(), `runflare-${service}-`));
  const archive = join(stage, 'source.tar');
  writeFileSync(archive, git('archive', '--format=tar', sha, ...(service === 'api' ? ['api/'] : [])));
  const source = join(stage, 'source');
  mkdirSync(source);
  execFileSync('tar', ['-xf', archive, '-C', source]);
  const context = service === 'api' ? join(source, 'api') : source;
  if (service === 'web') copyFileSync(join(source, 'web/Dockerfile'), join(context, 'Dockerfile'));
  // Bake traceability into defaults: Runflare uploads need no build-arg support.
  let dockerfile = readFileSync(join(context, 'Dockerfile'), 'utf8');
  dockerfile = dockerfile.replace(/^ARG VCS_REF=.*$/gm, `ARG VCS_REF=${sha}`)
    .replace(/^ARG APP_BUILD=.*$/gm, `ARG APP_BUILD=${sha}`);
  writeFileSync(join(context, 'Dockerfile'), dockerfile);
  writeFileSync(join(context, 'deployment-source.json'), JSON.stringify({ commit: sha, service }, null, 2) + '\n');
  const name = `${service}-${sha}.zip`;
  // Python's standard ZIP library works on Windows and Linux; no package install.
  execFileSync('python', ['-c', [
    'import pathlib, sys, zipfile',
    'root = pathlib.Path(sys.argv[1])',
    'with zipfile.ZipFile(sys.argv[2], "w", compression=zipfile.ZIP_DEFLATED) as z:',
    ' for p in sorted(root.rglob("*")):',
    '  if p.is_file():',
    '   info = zipfile.ZipInfo(p.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))',
    '   info.compress_type = zipfile.ZIP_DEFLATED',
    '   info.external_attr = (p.stat().st_mode & 0xFFFF) << 16',
    '   z.writestr(info, p.read_bytes())',
  ].join('\n'), context, join(out, name)]);
  manifest.services[service] = { archive: name, sha256: createHash('sha256').update(readFileSync(join(out, name))).digest('hex'), dockerfile: 'Dockerfile', context: '.', target: service === 'api' ? 'default' : null };
}
writeFileSync(join(out, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
