import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomBytes } from 'node:crypto'
import { encryptBackup,decryptBackup } from '../alilab-encrypted-backup.mjs'
test('encrypted backup restores exact bytes and refuses wrong keys, tampering and occupied targets',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'alilab-crypto-test-'))
  t.after(()=>fs.rm(root,{recursive:true,force:true}))
  const data=path.join(root,'data'),target=path.join(root,'restored'),archive=path.join(root,'backup.enc'),key=randomBytes(32)
  await fs.mkdir(data)
  const files={'db.json':'{"users":[],"test":"private-data-marker"}','secret':'private-secret-marker','nested/فارسی.bin':Buffer.from([0,1,2,255])}
  for(const [name,body]of Object.entries(files)){await fs.mkdir(path.dirname(path.join(data,name)),{recursive:true});await fs.writeFile(path.join(data,name),body)}
  assert.equal((await encryptBackup(data,archive,key)).files,3)
  assert.equal((await fs.stat(archive)).mode&0o777,0o600)
  const encrypted=await fs.readFile(archive)
  assert.equal(encrypted.includes(Buffer.from('private-secret-marker')),false)
  await assert.rejects(encryptBackup(data,archive,key),{code:'EEXIST'})
  await assert.rejects(encryptBackup(data,path.join(data,'bad.enc'),key),/outside/)
  await assert.rejects(decryptBackup(archive,target,randomBytes(32)))
  await assert.rejects(fs.access(target),{code:'ENOENT'})
  const corrupt=path.join(root,'corrupt.enc'),copy=Buffer.from(encrypted);copy[copy.length-1]^=1;await fs.writeFile(corrupt,copy)
  await assert.rejects(decryptBackup(corrupt,target,key))
  await assert.rejects(fs.access(target),{code:'ENOENT'})
  await decryptBackup(archive,target,key)
  for(const [name,body]of Object.entries(files))assert.deepEqual(await fs.readFile(path.join(target,name)),Buffer.from(body))
  await assert.rejects(decryptBackup(archive,target,key),/must be empty/)
  const link=path.join(root,'link');await fs.symlink(target,link);await assert.rejects(decryptBackup(archive,link,key),/regular directory/)
  const second=path.join(root,'second.enc');await encryptBackup(data,second,key)
  assert.notDeepEqual(await fs.readFile(second),encrypted)
})
