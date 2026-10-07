// Offline filesystem snapshots for the single-writer JSON API. Stop the API before use.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

async function filesIn(root, prefix = '') {
  const out = []
  for (const entry of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) out.push(...await filesIn(root, relative))
    else if (entry.isFile()) out.push(relative)
    else throw new Error('Snapshot refuses symlinks and special files')
  }
  return out.sort()
}
const digest = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex')
const contains = (parent, child) => child === parent || child.startsWith(parent + path.sep)

async function copyPrivate(from, to) {
  await fs.mkdir(to, { recursive: true, mode: 0o700 })
  for (const relative of await filesIn(from)) {
    const target = path.join(to, relative)
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
    await fs.copyFile(path.join(from, relative), target, fs.constants.COPYFILE_EXCL)
    await fs.chmod(target, 0o600)
  }
}

export async function createSnapshot(dataDir, outputDir) {
  const data = path.resolve(dataDir), output = path.resolve(outputDir)
  if (contains(data, output) || contains(output, data)) throw new Error('Data and snapshot paths must be separate')
  const names = await filesIn(data)
  if (!names.includes('db.json') || !names.includes('secret')) throw new Error('Snapshot requires initialized API data')
  await fs.mkdir(output, { mode: 0o700 }) // existing snapshots are never overwritten
  await copyPrivate(data, path.join(output, 'data'))
  const files = {}
  for (const relative of names) files[relative] = await digest(path.join(output, 'data', relative))
  const manifest = { format: 1, created: new Date().toISOString(), build: process.env.APP_BUILD || 'unspecified', files }
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' })
  return manifest
}

export async function restoreSnapshot(snapshotDir, targetDir) {
  const snapshot = path.resolve(snapshotDir), target = path.resolve(targetDir)
  if (contains(snapshot, target) || contains(target, snapshot)) throw new Error('Restore and snapshot paths must be separate')
  const source = path.join(snapshot, 'data')
  const manifest = JSON.parse(await fs.readFile(path.join(snapshot, 'manifest.json'), 'utf8'))
  const names = await filesIn(source)
  if (manifest.format !== 1 || !manifest.files || !names.includes('db.json') || !names.includes('secret')) throw new Error('Invalid snapshot')
  if (JSON.stringify(names) !== JSON.stringify(Object.keys(manifest.files).sort())) throw new Error('Snapshot file list changed')
  for (const relative of names) {
    if (await digest(path.join(source, relative)) !== manifest.files[relative]) throw new Error('Snapshot checksum mismatch')
  }
  let entries = []
  try { entries = await fs.readdir(target) } catch (err) { if (err.code !== 'ENOENT') throw err }
  if (entries.length) throw new Error('Restore target must be empty')
  await copyPrivate(source, target)
  return manifest
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, source, target, stopped] = process.argv.slice(2)
  try {
    if (!source || !target || stopped !== '--api-stopped') throw new Error('Usage: node scripts/alilab-snapshot.mjs <create|restore> SOURCE TARGET --api-stopped')
    const fn = command === 'create' ? createSnapshot : command === 'restore' ? restoreSnapshot : null
    if (!fn) throw new Error('Choose create or restore')
    const result = await fn(source, target)
    console.log(`Snapshot ${command} complete: ${Object.keys(result.files).length} files. Encrypt before off-host storage.`)
  } catch (err) { console.error(err.message); process.exitCode = 1 }
}
