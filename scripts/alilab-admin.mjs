// Offline initial invitation/admin setup. Never open public registration to bootstrap an admin.
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export async function bootstrapInvite(dataDir) {
  const dir = path.resolve(dataDir), file = path.join(dir, 'db.json')
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  const code = randomBytes(16).toString('hex').toUpperCase()
  const db = { users: [], creds: [], subs: [], invites: [{ code, note: 'Initial AliLab owner', createdBy: 'offline-bootstrap', created: new Date().toISOString() }] }
  // A second bootstrap cannot overwrite an initialized database.
  await fs.writeFile(file, JSON.stringify(db, null, 2), { flag: 'wx', mode: 0o600 })
  return code
}

export async function grantAdmin(dataDir, uid) {
  const file = path.join(path.resolve(dataDir), 'db.json')
  const db = JSON.parse(await fs.readFile(file, 'utf8'))
  const user = db.users?.find(user => user.id === uid)
  if (!user) throw new Error('No account with that exact user ID')
  user.admin = true
  const temp = file + '.alilab-tmp'
  await fs.writeFile(temp, JSON.stringify(db, null, 2), { flag: 'wx', mode: 0o600 })
  await fs.rename(temp, file)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, dir, ...rest] = process.argv.slice(2)
  try {
    if (!dir || rest.at(-1) !== '--api-stopped') throw new Error('Stop the API first; use invite DATA_DIR --api-stopped or admin DATA_DIR USER_ID --api-stopped')
    if (command === 'invite' && rest.length === 1) console.log(await bootstrapInvite(dir))
    else if (command === 'admin' && rest.length === 2) { await grantAdmin(dir, rest[0]); console.log('Existing account is now an admin.') }
    else throw new Error('Invalid arguments')
  } catch (err) { console.error(err.message); process.exitCode = 1 }
}
