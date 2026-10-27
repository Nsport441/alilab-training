import fs from 'node:fs';

const sha = v => typeof v === 'string' && /^[a-f0-9]{40}$/i.test(v) ? v.toLowerCase() : null;
const date = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
export const compare = (a, b) => a && b ? a === b ? 'same' : 'different' : 'unknown';

// A deployment observation is independent of build metadata. Only an operator-owned,
// read-only mounted evidence file may provide it; there is deliberately no write API.
export function deploymentEvidence(file) {
  let raw;
  try {
    if (!file || fs.statSync(file).size > 32768) return null;
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return null; }
  if (!raw || typeof raw !== 'object' || raw.provider !== 'runflare' || !date(raw.observedAt) || typeof raw.source !== 'string' || raw.source.length > 500 || !/^https:\/\/[^\s]+$/.test(raw.source)) return null;
  const result = { provider: 'runflare', observedAt: date(raw.observedAt), source: raw.source.slice(0, 500) };
  for (const name of ['api', 'web']) {
    const s = raw[name] || {};
    result[name] = {
      commit: sha(s.commit),
      image: typeof s.image === 'string' && /^(?:[a-zA-Z0-9._:/-]+@)?sha256:[a-f0-9]{64}$/.test(s.image) ? s.image : null,
      version: typeof s.version === 'string' && /^[a-zA-Z0-9.+_-]{1,100}$/.test(s.version) ? s.version : null,
      deployedAt: date(s.deployedAt),
      status: ['running', 'failed', 'pending', 'stopped'].includes(s.status) ? s.status : 'unknown',
    };
  }
  return result;
}

export function createReleaseReader({ env = process.env, fetcher = fetch } = {}) {
  let cached, expires = 0, pending;
  async function github() {
    if (Date.now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      let result = { commit: null, checkedAt: new Date().toISOString(), status: 'unknown' };
      try {
        const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'AliLab-release-monitor' };
        if (env.RELEASE_GITHUB_TOKEN) headers.Authorization = `Bearer ${env.RELEASE_GITHUB_TOKEN}`;
        const r = await fetcher('https://api.github.com/repos/Nsport441/alilab-training/commits/main', {
          headers, signal: AbortSignal.timeout(5000), redirect: 'error',
        });
        if (r.ok) {
          const body = await r.json();
          if (sha(body.sha)) result = { ...result, commit: sha(body.sha), status: 'available' };
        }
      } catch { /* Missing credentials, network and rate limits all remain unknown. */ }
      cached = result; expires = Date.now() + 60000;
      return result;
    })();
    try { return await pending; } finally { pending = null; }
  }
  return async () => {
    const upstream = await github();
    const deployed = deploymentEvidence(env.RELEASE_EVIDENCE_FILE);
    const runtime = {
      version: JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version,
      commit: sha(env.ALILAB_BUILD_COMMIT),
    };
    return { github: upstream, runtime, deployed, comparisons: {
      githubApi: compare(upstream.commit, deployed?.api.commit),
      githubWeb: compare(upstream.commit, deployed?.web.commit),
      apiWeb: compare(deployed?.api.commit, deployed?.web.commit),
      runtimeApi: compare(runtime.commit, deployed?.api.commit),
    } };
  };
}
