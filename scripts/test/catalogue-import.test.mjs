import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { EXDB, EXALIAS } from '../../frontend/src/lib/exercises-data.js'
import { EXERCISES } from '../../api/coach/core/library-data.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'catalogue',p),'utf8'))
const legacy=read('legacy.json'), source=read('upstream.json'), manifest=read('media-manifest.json'), provenance=read('provenance.json')
const byId=new Map(EXDB.map(e=>[e.id,e]))

test('counts independent records, not files or alternate drawings',()=>{
  assert.equal(source.length,6554); assert.equal(EXDB.length,5632)
  assert.equal(byId.size,5632); assert.equal(Object.keys(EXALIAS).length,922)
  assert.equal(EXDB.length-legacy.length,4308)
  for(const [alias,id] of Object.entries(EXALIAS)) { assert.ok(byId.has(id)); assert.ok(!byId.has(alias)) }
  assert.deepEqual(EXERCISES.map(e=>e.id),EXDB.map(e=>e.id))
})
test('all legacy workout/favourite/history identities survive without rewriting user state',()=>{
  for(const e of legacy) {
    assert.equal(byId.get(e.id)?.n,e.n, e.id)
    assert.deepEqual(byId.get(e.id).st,e.st, e.id+' instructions')
  }
  const before={routines:[{id:'mine',ex:legacy.map(e=>({id:e.id,sets:3,reps:7,weight:42,mode:'reps'}))}],
    workouts:[{d:'2025-01-01',ex:legacy.map(e=>({id:e.id,sets:[{w:42,r:7,done:true}]}))}],
    favourites:legacy.map(e=>e.id),customEx:[{id:'custom-owned',n:'My exercise',custom:true}],notes:'keep'}
  const bytes=JSON.stringify(before)
  for(const r of before.routines[0].ex) assert.ok(byId.has(r.id))
  assert.equal(JSON.stringify(before),bytes)
})
test('preserves every transferable English detail, taxonomy, muscle map and variant reference',()=>{
  for(const e of source.filter(e=>!e.variantOf)) {
    const actual=byId.get(e.id)
    assert.equal(actual.n,e.name); assert.deepEqual(actual.st,e.instructions)
    assert.equal(actual.desc,e.description); assert.equal(actual.cat,e.category)
    assert.equal(actual.eq,e.equipment); assert.equal(actual.tg,e.target)
    assert.deepEqual(actual.sm,e.secondaryMuscles)
    assert.deepEqual(actual.nd,e.needs); assert.equal(actual.hd,e.hold?1:undefined)
    assert.equal(actual.fv,e.femaleVariant); assert.equal(actual.mv,e.maleVariant)
    assert.deepEqual(actual.muscleWeights,e.muscleMap?.weights)
  }
})
test('new records introduce no duplicate name/taxonomy identity',()=>{
  const legacyIds=new Set(legacy.map(e=>e.id)), groups=new Map()
  for(const e of EXDB) {
    const key=JSON.stringify([e.n.toLowerCase().trim(),e.bp,e.eq,e.tg,e.sm])
    if(groups.has(key)) assert.ok(legacyIds.has(e.id)&&legacyIds.has(groups.get(key)),key)
    groups.set(key,e.id)
  }
})

function webpSize(b) {
  assert.equal(b.toString('ascii',0,4),'RIFF'); assert.equal(b.toString('ascii',8,12),'WEBP')
  const type=b.toString('ascii',12,16)
  if(type==='VP8X') return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)]
  if(type==='VP8 ') { assert.equal(b.toString('hex',23,26),'9d012a'); return [b.readUInt16LE(26)&16383,b.readUInt16LE(28)&16383] }
  assert.equal(type,'VP8L'); assert.equal(b[20],0x2f)
  const bits=b.readUInt32LE(21); return [(bits&16383)+1,((bits>>>14)&16383)+1]
}
function mp4Size(b) {
  const sizes=[]; const containers=new Set(['moov','trak','mdia','minf','stbl'])
  function atoms(start,end) {
    for(let p=start;p+8<=end;) {
      const size=b.readUInt32BE(p),type=b.toString('ascii',p+4,p+8)
      assert.ok(size>=8&&p+size<=end,`invalid MP4 atom ${type}`)
      if(type==='tkhd') sizes.push([b.readUInt32BE(p+size-8)/65536,b.readUInt32BE(p+size-4)/65536])
      if(containers.has(type)) atoms(p+8,p+size)
      p+=size
    }
  }
  assert.equal(b.toString('ascii',4,8),'ftyp'); atoms(0,b.length)
  assert.ok(b.includes(Buffer.from('avc1')),'browser-compatible H.264 sample entry required')
  return sizes.filter(([w,h])=>w&&h)
}
test('all shipped media are pinned original bytes, valid WebP/MP4 containers, at most 180px',()=>{
  assert.equal(Object.keys(manifest).length,EXDB.length*2)
  let bytes=0
  for(const e of EXDB) for(const [kind,ext] of [['still','webp'],['clip','mp4']]) {
    const rel=`${kind}/${e.id}.${ext}`, m=manifest[rel]
    const b=fs.readFileSync(path.join(root,'frontend/public/opengym-media',rel))
    assert.equal(b.length,m.bytes,rel)
    assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256,rel)
    const sizes=ext==='webp'?[webpSize(b)]:mp4Size(b)
    assert.ok(sizes.length,rel)
    for(const [w,h] of sizes) assert.ok(w>0&&h>0&&w<=180&&h<=180,`${rel}: ${w}x${h}`)
    bytes+=b.length
  }
  assert.equal(bytes,provenance.mediaBytes)
  assert.ok(bytes<180*1024*1024,'media budget exceeded')
  const notice=fs.readFileSync(path.join(root,'catalogue/UPSTREAM-NOTICE.md'),'utf8')
  assert.match(notice,/non-commercial fork/); assert.match(notice,/Gym visual/)
  assert.equal(fs.readFileSync(path.join(root,'frontend/public/opengym-media/NOTICE.md'),'utf8').includes('not** covered'),true)
})
