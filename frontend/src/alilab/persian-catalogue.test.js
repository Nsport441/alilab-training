// @vitest-environment node
import { afterEach, expect,it } from 'vitest'
import { EXDB,matchExercise } from '../lib/exercises.js'
import { _setLangState,exerciseNameFor,instrFor,hasLocalizedInstructions } from '../lib/i18n-core.js'
import legacy from '../../../catalogue/legacy.json' with { type: 'json' }
import names from '../exercise-names/fa.js'
import guides from '../instr/fa.js'
import fa from '../locales/fa.js'
afterEach(()=>_setLangState('en'))
it('covers stable IDs, retains bilingual search and leaves custom names intact',()=>{
  expect(Object.keys(names).sort()).toEqual(legacy.map(ex=>ex.id).sort())
  for(const n of Object.values(names)){expect(n).toMatch(/[\u0600-\u06ff]/);expect(n.length).toBeGreaterThan(2)}
  _setLangState('fa',fa,guides,names)
  const bench=EXDB.find(ex=>ex.id==='0025')
  expect(exerciseNameFor(bench)).toContain('پرس سینه')
  expect(matchExercise(bench,'پرس سینه هالتر')).toBe(true)
  expect(matchExercise(bench,'barbell bench')).toBe(true)
  expect(exerciseNameFor({id:'custom-1',n:'openGym یادداشت من'})).toBe('openGym یادداشت من')
  expect(exerciseNameFor({id:'0025',custom:true,n:'نام خودم'})).toBe('نام خودم')
  expect(instrFor({id:'0025',custom:true,st:['راهنمای خودم']})).toEqual(['راهنمای خودم'])
})
it('labels actual per-exercise fallback and preserves the English original',()=>{
  expect(Object.keys(guides)).toHaveLength(280)
  _setLangState('fa',fa,guides,names)
  const translated=EXDB.find(ex=>guides[ex.id]),fallback=EXDB.find(ex=>!guides[ex.id])
  expect(hasLocalizedInstructions(translated)).toBe(true)
  expect(instrFor(translated)).toBe(guides[translated.id])
  expect(hasLocalizedInstructions(fallback)).toBe(false)
  expect(instrFor(fallback)).toBe(fallback.st)
})
