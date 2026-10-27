// Build artifact verification: a served Web manifest must identify exactly this build,
// without secrets or a plausible but unvalidated commit.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('dist/release-build.json', 'utf8'))
const expected = /^[a-f0-9]{40}$/i.test(process.env.APP_BUILD || '') ? process.env.APP_BUILD.toLowerCase() : null
assert.deepEqual(Object.keys(manifest).sort(), ['commit', 'version'])
assert.equal(manifest.commit, expected)
assert.match(manifest.version, /^1\.3\.9\+alilab\.1d\.security/)
if (expected) assert.ok(manifest.version.includes(expected))
assert.match(readFileSync('public/sw.js', 'utf8'), /url\.pathname\.endsWith\('\/release-build\.json'\)/)
console.log('Web build identity verified:', expected || '(unknown local build)')
