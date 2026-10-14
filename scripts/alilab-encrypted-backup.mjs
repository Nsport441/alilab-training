// Offline only. Keep the 32-byte key outside the host, repository and backup archive.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { deflateSync, inflateSync } from 'node:zlib'
import { createSnapshot, restoreSnapshot } from './alilab-snapshot.mjs'
const MAGIC=Buffer.from('ALILAB-BACKUP-1\n'), LIMIT=256*1024*1024
const validName=n=>typeof n==='string'&&n.length>0&&!n.includes('\\')&&!n.includes('\0')&&!path.posix.isAbsolute(n)&&n.split('/').every(p=>p&&p!=='.'&&p!=='..')
const assertKey=k=>{if(!Buffer.isBuffer(k)||k.length!==32)throw new Error('A 32-byte key is required')}
const contains=(parent,child)=>child===parent||child.startsWith(parent+path.sep)
export async function encryptBackup(dataDir,outputFile,key,{excludeBackupArtifacts=false}={}){
  assertKey(key)
  const data=path.resolve(dataDir),output=path.resolve(outputFile)
  const artifactDir=path.join(data,'.alilab-backups')
  if(contains(data,output)&&!(excludeBackupArtifacts&&output!==artifactDir&&contains(artifactDir,output)))throw new Error('Backup output must be outside the data directory or inside the explicitly excluded artifact directory')
  if(excludeBackupArtifacts){
    try{const stat=await fs.lstat(artifactDir);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Backup artifact directory must be a regular directory')}catch(error){if(error.code!=='ENOENT')throw error}
  }
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'alilab-backup-'))
  try{
    const snapshot=path.join(tmp,'snapshot'),manifest=await createSnapshot(data,snapshot,{excludeBackupArtifacts}),files={}
    let bytes=0
    for(const name of Object.keys(manifest.files)){
      if(!validName(name))throw new Error('Unsafe snapshot path')
      const body=await fs.readFile(path.join(snapshot,'data',name));bytes+=body.length
      if(bytes>LIMIT/2)throw new Error('Backup exceeds supported size')
      files[name]=body.toString('base64')
    }
    const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(MAGIC)
    const plain=deflateSync(Buffer.from(JSON.stringify({manifest,files})))
    const encrypted=Buffer.concat([cipher.update(plain),cipher.final()])
    await fs.writeFile(output,Buffer.concat([MAGIC,nonce,cipher.getAuthTag(),encrypted]),{flag:'wx',mode:0o600})
    return {files:Object.keys(files).length}
  }finally{await fs.rm(tmp,{recursive:true,force:true})}
}
export async function decryptBackup(inputFile,targetDir,key){
  assertKey(key)
  if((await fs.stat(inputFile)).size>LIMIT)throw new Error('Backup exceeds supported size')
  const e=await fs.readFile(inputFile)
  if(e.length<=MAGIC.length+28||!e.subarray(0,MAGIC.length).equals(MAGIC))throw new Error('Unsupported backup format')
  const cipher=createDecipheriv('aes-256-gcm',key,e.subarray(MAGIC.length,MAGIC.length+12))
  cipher.setAAD(MAGIC);cipher.setAuthTag(e.subarray(MAGIC.length+12,MAGIC.length+28))
  const compressed=Buffer.concat([cipher.update(e.subarray(MAGIC.length+28)),cipher.final()])
  const p=JSON.parse(inflateSync(compressed,{maxOutputLength:LIMIT}).toString('utf8'))
  if(!p.manifest?.files||!p.files||Array.isArray(p.files))throw new Error('Invalid backup payload')
  const names=Object.keys(p.files).sort()
  if(!names.length||names.some(n=>!validName(n)))throw new Error('Unsafe backup path')
  if(JSON.stringify(names)!==JSON.stringify(Object.keys(p.manifest.files).sort()))throw new Error('Backup file list changed')
  try{const stat=await fs.lstat(targetDir);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Restore target must be a regular directory')}catch(error){if(error.code!=='ENOENT')throw error}
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'alilab-restore-'))
  try{
    await fs.mkdir(path.join(tmp,'data'),{mode:0o700})
    for(const name of names){
      if(typeof p.files[name]!=='string')throw new Error('Invalid backup file')
      const body=Buffer.from(p.files[name],'base64')
      if(body.toString('base64')!==p.files[name])throw new Error('Invalid base64 content')
      const target=path.join(tmp,'data',...name.split('/'))
      await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700})
      await fs.writeFile(target,body,{flag:'wx',mode:0o600})
    }
    await fs.writeFile(path.join(tmp,'manifest.json'),JSON.stringify(p.manifest),{flag:'wx',mode:0o600})
    return await restoreSnapshot(tmp,targetDir)
  }finally{await fs.rm(tmp,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [command,source,target,keyFile,stopped,...flags]=process.argv.slice(2)
  try{
    if(!source||!target||!keyFile||stopped!=='--api-stopped'||!['create','restore'].includes(command)||flags.some(f=>f!=='--exclude-backup-artifacts')||(command==='restore'&&flags.length))throw new Error('Usage: node scripts/alilab-encrypted-backup.mjs <create|restore> SOURCE TARGET PRIVATE_KEY_FILE --api-stopped [--exclude-backup-artifacts]')
    const stat=await fs.lstat(keyFile)
    if(!stat.isFile()||stat.isSymbolicLink()||(process.platform!=='win32'&&(stat.mode&0o077)))throw new Error('Key must be a private regular file (0600)')
    const key=await fs.readFile(keyFile)
    try{await(command==='create'?encryptBackup:decryptBackup)(source,target,key,{excludeBackupArtifacts:flags.includes('--exclude-backup-artifacts')})}finally{key.fill(0)}
    console.log(`Encrypted backup ${command} complete.`)
  }catch(error){console.error(error.message);process.exitCode=1}
}
