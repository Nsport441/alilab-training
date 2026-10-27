import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB, EXIDX, imgSrc, gifSrc } from '../frontend/src/lib/exercises.js'
import { planMediaUrls } from '../frontend/src/lib/media-prefetch.js'
import { CATALOGUE_MEDIA } from '../frontend/src/alilab/catalogue-media-registry.js'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('../', import.meta.url))
assert.equal(EXDB.length, 1324)
for (const ex of EXDB) {
  assert.equal(EXIDX[ex.id].n, ex.n)
  assert.equal(imgSrc(ex), CATALOGUE_MEDIA[ex.id]?.images[0].path || `./opengym-media/still/${ex.id}.webp`)
  assert.equal(gifSrc(ex), `./opengym-media/clip/${ex.id}.mp4`)
  assert(fs.existsSync(path.join(root, 'frontend/public/opengym-media/clip', `${ex.id}.mp4`)))
  assert(fs.existsSync(path.join(root, 'frontend/public/opengym-media/still', `${ex.id}.webp`)))
}
assert.equal(Object.keys(CATALOGUE_MEDIA).length,19)
for(const record of Object.values(CATALOGUE_MEDIA)){
  assert.equal(EXIDX[record.exerciseId].n,record.canonicalName)
  assert.equal(record.images.length,2)
  for(const image of record.images){
    assert.equal(image.author,'Everkinetic');assert.equal(image.license,'CC BY-SA 3.0');assert.equal(image.modified,false)
    assert(/^\.\/catalogue-media\/wger-\d+\.png$/.test(image.path))
    const bytes=fs.readFileSync(path.join(root,'frontend/public',image.path))
    assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256)
  }
}
const urls=planMediaUrls({routines:[{ex:EXDB.map(ex=>({id:ex.id}))}]},'https://training.alilab.ir/')
assert.equal(urls.length,2667)
assert(urls.every(url=>url.startsWith('https://training.alilab.ir/catalogue-media/') || url.startsWith('https://training.alilab.ir/opengym-media/')))
assert.equal(imgSrc({id:'not-approved',img:'old.jpg'}),null)
assert.equal(imgSrc({id:'0025',custom:true,img:'old.jpg'}),null)
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
assert(fs.existsSync(path.join(root, 'frontend/public/opengym-media/NOTICE.md')))
console.log('AliLab boundary passed: 1324 exercise videos and stills retained as non-commercial openGym fork, local only, third-party notice present.')
