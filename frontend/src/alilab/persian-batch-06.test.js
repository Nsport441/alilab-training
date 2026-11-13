// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterEach, expect, it } from 'vitest'
import batch06 from '../../../catalogue/persian-batch-06-review.json' with { type: 'json' }
import batch07 from '../../../catalogue/persian-batch-07-review.json' with { type: 'json' }
import batch08 from '../../../catalogue/persian-batch-08-review.json' with { type: 'json' }
import batch09 from '../../../catalogue/persian-batch-09-review.json' with { type: 'json' }
import batch10 from '../../../catalogue/persian-batch-10-review.json' with { type: 'json' }
import batch11 from '../../../catalogue/persian-batch-11-review.json' with { type: 'json' }
import batch12 from '../../../catalogue/persian-batch-12-review.json' with { type: 'json' }
import additions from './persian-batch-01.json' with { type: 'json' }
import { EXDB, matchExercise } from '../lib/exercises.js'
import { _setLangState, exerciseNameFor, instrFor, hasLocalizedInstructions } from '../lib/i18n-core.js'
import names from '../exercise-names/fa.js'
import guides from '../instr/fa.js'
import fa from '../locales/fa.js'

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
afterEach(() => _setLangState('en'))

const batches = [{ review: batch06, count: 500 }, { review: batch07, count: 400 }, { review: batch08, count: 450 }, { review: batch09, count: 400 }, { review: batch10, count: 390 }, { review: batch11, count: 400 }, { review: batch12, count: 400 }]

it('preserves numerical instructions in batch 10', () => {
  const numbers = text => (text.replace(/[۰-۹٠-٩]/g, char => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(char) % 10)).match(/\d+/g) ?? [])
  for (const { id, unreviewed_steps } of batch10.records) {
    const ex = EXDB.find(item => item.id === id)
    expect(unreviewed_steps, id).toEqual([])
    expect(numbers(additions[id].name), id).toEqual(numbers(ex.n))
    for (let i = 0; i < ex.st.length; i++) {
      expect(numbers(additions[id].instructions[i]), `${id}:${i + 1}`).toEqual(numbers(ex.st[i]))
    }
  }
  expect(batch10.unreviewed_count).toBe(0)
})

it('has no unchecked instruction steps in batch 08', () => {
  expect(batch08.unreviewed_count).toBe(0)
  for (const row of batch08.records) expect(row.unreviewed_steps).toEqual([])
})

it('has no unchecked instruction steps in batch 09', () => {
  expect(batch09.unreviewed_count).toBe(0)
  for (const row of batch09.records) expect(row.unreviewed_steps).toEqual([])
})

it('keeps earlier Persian IDs and adds each new independent ID only once', () => {
  const ids = [...batch06.previously_localized_ids, ...batches.flatMap(({ review }) =>
    review.records.map(row => row.id))]
  expect(new Set(ids).size).toBe(ids.length)
  expect(Object.keys(additions).sort()).toEqual(ids.sort())
})

it.each(batches)('binds all $count localized IDs to their original text', ({ review, count }) => {
  const ids = review.records.map(row => row.id)
  expect(ids).toHaveLength(count)
  expect(new Set(ids).size).toBe(count)
  expect(ids.some(id => (review.deferred_ids ?? []).includes(id))).toBe(false)
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

it.each(batches)('finds all $count exercises in either language and preserves the English guide', ({ review }) => {
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

it('preserves numerical instructions in batch 11', () => {
  const numbers = text => (text.replace(/[۰-۹٠-٩]/g, char => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(char) % 10)).match(/\d+/g) ?? [])
  expect(batch11.unreviewed_count).toBe(0)
  for (const { id, unreviewed_steps } of batch11.records) {
    const ex = EXDB.find(item => item.id === id)
    expect(unreviewed_steps, id).toEqual([])
    expect(numbers(additions[id].name), id).toEqual(numbers(ex.n))
    for (let i = 0; i < ex.st.length; i++) expect(numbers(additions[id].instructions[i]), `${id}:${i + 1}`).toEqual(numbers(ex.st[i]))
  }
})

it('keeps equipment setup and foot contact cues safe in batch 11', () => {
  for (const id of ['4439', '3316', '2721']) {
    expect(additions[id].instructions[0], id).not.toMatch(/روی (دمبل|هالتر|میله|جسم|شی)/)
  }
  for (const [id, index] of [['4045', 3], ['3350', 2]]) {
    expect(additions[id].instructions[index], id).toContain('کف هر دو پا')
    expect(additions[id].instructions[index], id).toContain('روی زمین')
  }
})

it('preserves numeric instructions in batch 12', () => {
  const numbers = text => (text.replace(/[۰-۹٠-٩]/g, char => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(char) % 10)).match(/\d+/g) ?? [])
  expect(batch12.unreviewed_count).toBe(0)
  for (const { id, unreviewed_steps } of batch12.records) {
    const ex = EXDB.find(item => item.id === id)
    expect(unreviewed_steps, id).toEqual([])
    expect(numbers(additions[id].name), id).toEqual(numbers(ex.n))
    for (let i = 0; i < ex.st.length; i++) expect(numbers(additions[id].instructions[i]), `${id}:${i + 1}`).toEqual(numbers(ex.st[i]))
  }
})
