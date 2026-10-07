import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB, EXIDX, imgSrc, gifSrc } from '../frontend/src/lib/exercises.js'
import { planMediaUrls } from '../frontend/src/lib/media-prefetch.js'

const root = fileURLToPath(new URL('../', import.meta.url))
assert.equal(EXDB.length, 1324)
for (const ex of EXDB) {
  assert.equal(EXIDX[ex.id].n, ex.n)
  assert.equal(imgSrc(ex), null)
  assert.equal(gifSrc(ex), null)
}
assert.deepEqual(planMediaUrls({ routines: [{ ex: EXDB.map(ex => ({ id: ex.id })) }] }, 'https://training.alilab.ir/'), [])
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')
assert(!/exercises-dataset|ghcr.io\/duartesantos8|media:\s*\n|\.\/media\//.test(compose))
assert(!/cdn.jsdelivr|VITE_IMG_BASE|VITE_GIF_BASE/.test(JSON.parse(fs.readFileSync(path.join(root, 'frontend/package.json'))).scripts['build:mobile']))
function checkBuilt(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) checkBuilt(file)
    else if (/\.(js|html|css)$/.test(file)) {
      assert(!/https?:[^\s"']*(?:jsdelivr\.net\/gh\/hasaneyldrm|raw\.githubusercontent\.com\/hasaneyldrm)/.test(fs.readFileSync(file, 'utf8')), 'Legacy media CDN URL in built output')
    }
  }
}
const dist = path.join(root, 'frontend/dist')
if (fs.existsSync(dist)) checkBuilt(dist)
console.log('AliLab boundary passed: 1324 exercises, zero catalogue URLs/prefetch, no inherited media downloader or CDN in the build.')
