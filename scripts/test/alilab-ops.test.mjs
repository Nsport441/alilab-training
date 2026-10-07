import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createSnapshot, restoreSnapshot } from '../alilab-snapshot.mjs'
import { bootstrapInvite, grantAdmin } from '../alilab-admin.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ORIGIN = 'http://localhost:8080'

async function startApi(data) {
  const child = spawn(process.execPath, ['api/server.js'], { cwd: ROOT, env: { ...process.env,
    PORT: '0', DATA_DIR: data, ORIGIN, RP_ID: 'localhost', INVITE_ONLY: '1',
    ALLOW_GUEST: '0', PASSWORD_LOGIN: '1', COACH_DISABLED: '1', MEDIA_UPLOADS: '0', TRUST_PROXY: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let logs = ''
  child.stderr.on('data', chunk => { logs += chunk })
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('API start timeout: ' + logs)) }, 10000)
    child.stdout.on('data', chunk => {
      logs += chunk
      const match = logs.match(/gym-api on :(\d+)/)
      if (match) { clearTimeout(timer); resolve(Number(match[1])) }
    })
    child.once('exit', code => { clearTimeout(timer); reject(new Error('API exited: ' + code + ' ' + logs)) })
  })
  return {
    async request(route, { method = 'GET', body, cookie } = {}) {
      const res = await fetch(`http://127.0.0.1:${port}${route}`, { method,
        headers: { Origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) })
      return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] }
    },
    async stop() { if (child.exitCode !== null) return; const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited },
  }
}

test('invited account, admin, workout state and original session survive an offline snapshot/restore', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alilab-ops-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const data = path.join(root, 'data'), snapshot = path.join(root, 'snapshot'), restored = path.join(root, 'restored')
  const code = await bootstrapInvite(data)
  await assert.rejects(bootstrapInvite(data), { code: 'EEXIST' })
  let api = await startApi(data)
  t.after(async () => api?.stop())
  const config = await api.request('/api/config')
  assert.equal(config.body.invite_only, true)
  assert.equal(config.body.allow_guest, false)
  assert.equal(config.body.media, undefined)
  const password = 'Alilab-Test-' + randomBytes(12).toString('hex')
  const signedIn = await api.request('/api/register/password', { method: 'POST', body: { name: 'AliLab restore test', password, code } })
  assert.equal(signedIn.status, 200)
  const uid = signedIn.body.user.id, cookie = signedIn.cookie
  const state = { routines: [{ id: 'r1', name: 'Test routine', ex: [{ id: '0025' }] }],
    workouts: [{ id: 'w1', d: '2026-10-07', name: 'Test routine', bw: 75, start: 1791351000000, end: 1791352800000,
      routineId: 'r1', routineIds: ['r1'], prs: [], entries: [{ id: '0025', topW: 60, target: null, sets: [{ w: 60, r: 8, done: true }] }] }],
    bodyweight: [{ d: '2026-10-07', w: 75, t: 1791351000000 }] }
  const saved = await api.request('/api/data', { method: 'PUT', cookie, body: { state, baseRev: 0 } })
  assert.equal(saved.status, 200)
  const before = await api.request('/api/data', { cookie })
  assert.equal(before.status, 200)
  await api.stop(); api = null
  await grantAdmin(data, uid)
  await fs.mkdir(path.join(data, 'uploads', uid), { recursive: true })
  await fs.writeFile(path.join(data, 'uploads', uid, 'test.bin'), 'private test bytes')
  const manifest = await createSnapshot(data, snapshot)
  assert.ok(manifest.files.secret)
  assert.ok(manifest.files['db.json'])
  assert.ok(manifest.files[path.join('uploads', uid, 'test.bin')])
  await assert.rejects(createSnapshot(data, snapshot), { code: 'EEXIST' })
  await restoreSnapshot(snapshot, restored)
  assert.deepEqual(await fs.readFile(path.join(restored, 'secret')), await fs.readFile(path.join(data, 'secret')))
  assert.equal(await fs.readFile(path.join(restored, 'uploads', uid, 'test.bin'), 'utf8'), 'private test bytes')
  api = await startApi(restored)
  const me = await api.request('/api/me', { cookie })
  assert.equal(me.status, 200)
  assert.equal(me.body.user.admin, true)
  const after = await api.request('/api/data', { cookie })
  assert.deepEqual(after.body, before.body)
  const login = await api.request('/api/login/password', { method: 'POST', body: { name: 'AliLab restore test', password } })
  assert.equal(login.status, 200)
  assert.equal((await api.request('/api/data', { cookie: login.cookie })).status, 200)
  assert.equal((await api.request('/api/media/example', { cookie })).status, 404)
  await api.stop(); api = null
  await assert.rejects(restoreSnapshot(snapshot, restored), /must be empty/)
})

test('restore rejects corrupted, extra and symlinked data before writing a target', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'alilab-invalid-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const data = path.join(root, 'data'), snapshot = path.join(root, 'snapshot'), target = path.join(root, 'target')
  await bootstrapInvite(data)
  await fs.writeFile(path.join(data, 'secret'), 'test-secret')
  await createSnapshot(data, snapshot)
  await fs.writeFile(path.join(snapshot, 'data', 'secret'), 'changed')
  await assert.rejects(restoreSnapshot(snapshot, target), /checksum/)
  await assert.rejects(fs.access(target), { code: 'ENOENT' })
  await fs.writeFile(path.join(snapshot, 'data', 'extra'), 'extra')
  await assert.rejects(restoreSnapshot(snapshot, target), /file list/)
  await fs.symlink(path.join(root, 'elsewhere'), path.join(data, 'link'))
  await assert.rejects(createSnapshot(data, path.join(root, 'new')), /symlinks/)
  await assert.rejects(grantAdmin(data, 'unknown-user'), /exact user ID/)
})
