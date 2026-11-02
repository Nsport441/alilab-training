// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, expect, it } from 'vitest'
import review from '../../../catalogue/persian-batch-06-review.json' with { type: 'json' }
import additions from './persian-batch-01.json' with { type: 'json' }
import { EXDB, matchExercise } from '../lib/exercises.js'
import { _setLangState, exerciseNameFor, instrFor, hasLocalizedInstructions } from '../lib/i18n-core.js'
import names from '../exercise-names/fa.js'
import guides from '../instr/fa.js'
import fa from '../locales/fa.js'

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
afterEach(() => _setLangState('en'))

it('ships exactly 500 new independent IDs with evidence tied to their original text', () => {
  const ids = review.records.map(row => row.id)
  expect(ids).toHaveLength(500)
  expect(new Set(ids).size).toBe(500)
  expect(ids.some(id => review.previously_localized_ids.includes(id))).toBe(false)
  expect(ids.some(id => review.deferred_ids.includes(id))).toBe(false)
  expect(Object.keys(additions).sort()).toEqual([...review.previously_localized_ids, ...ids].sort())
  let steps = 0
  for (const row of review.records) {
    const ex = EXDB.find(ex => ex.id === row.id)
    expect(ex, row.id).toBeDefined()
    expect(digest({ name: ex.n, instructions: ex.st }), row.id).toBe(row.source_sha256)
    const translated = additions[row.id]
    expect(digest(translated), row.id).toBe(row.translation_sha256)
    expect(translated.instructions, row.id).toHaveLength(ex.st.length)
    steps += translated.instructions.length
  }
  expect(steps).toBe(review.instruction_count)
})

it('finds all 500 exercises in Persian and English and keeps original English guides on language change', () => {
  const originals = new Map(review.records.map(({ id }) => {
    const ex = EXDB.find(ex => ex.id === id)
    return [id, JSON.stringify(ex)]
  }))
  _setLangState('fa', fa, guides, names)
  for (const { id } of review.records) {
    const ex = EXDB.find(ex => ex.id === id)
    expect(exerciseNameFor(ex), id).toContain(additions[id].name)
    expect(hasLocalizedInstructions(ex), id).toBe(true)
    expect(instrFor(ex), id).toEqual(additions[id].instructions)
    expect(matchExercise(ex, additions[id].name), `${id} Persian search`).toBe(true)
    expect(matchExercise(ex, ex.n), `${id} English search`).toBe(true)
  }
  _setLangState('en')
  for (const { id } of review.records) {
    const ex = EXDB.find(ex => ex.id === id)
    expect(exerciseNameFor(ex), id).toBe(ex.n)
    expect(instrFor(ex), id).toEqual(ex.st)
    expect(JSON.stringify(ex), `${id} original data`).toBe(originals.get(id))
  }
})
