// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import legacy from '../../../catalogue/legacy.json' with { type:'json' }
import { EXDB, CATALOGUE, CATEGORIES, EXIDX, searchExercises, equipmentOf, isCardio, registerCustom, imgSrc, gifSrc } from './exercises.js'
import { EXALIAS } from './exercises-data.js'
import { defaultConfig, modeOf } from './history.js'
import { _setLangState, exerciseNameFor, instrFor, hasLocalizedInstructions } from './i18n-core.js'
import names from '../exercise-names/fa.js'
import guides from '../instr/fa.js'
import fa from '../locales/fa.js'
import { planMediaUrls, MAX_PREFETCH_URLS } from './media-prefetch.js'
afterEach(()=>{_setLangState('en');registerCustom([])})

it('keeps the logging mode of every old config while seeding new held movements as time',()=>{
  for(const ex of legacy) {
    expect(isCardio(ex.id),ex.id).toBe(ex.bp==='cardio')
    expect(modeOf({id:ex.id}),ex.id).toBe(ex.bp==='cardio'?'cardio':'reps')
    expect(modeOf({id:ex.id,mode:'time'})).toBe('time')
  }
  const held=EXDB.find(ex=>ex.hd)
  expect(defaultConfig(held.id).mode).toBe('time')
  expect(defaultConfig(held.id,'reps').mode).toBe('reps')
})
it('makes every category and equipment discoverable through the expanded catalogue',()=>{
  expect(CATEGORIES).toHaveLength(12)
  for(const cat of CATEGORIES) {
    const group=CATALOGUE.filter(ex=>ex.cat===cat)
    expect(group.length).toBeGreaterThan(0)
    expect(equipmentOf(group).length).toBeGreaterThan(0)
    expect(searchExercises(group,cat)).toHaveLength(group.length)
  }
  expect(searchExercises(CATALOGUE,'123 back drill').some(ex=>ex.id==='5984')).toBe(true)
})
it('preserves reviewed Persian content and explicitly falls back to complete English on all new entries',()=>{
  _setLangState('fa',fa,guides,names)
  const old=new Set(legacy.map(ex=>ex.id))
  const added=EXDB.filter(ex=>!old.has(ex.id))
  expect(added).toHaveLength(4308)
  for(const ex of added) {
    expect(exerciseNameFor(ex)).toBe(ex.n)
    expect(instrFor(ex)).toBe(ex.st)
    expect(hasLocalizedInstructions(ex)).toBe(false)
    expect(ex.st.length).toBeGreaterThan(0)
  }
  expect(searchExercises(CATALOGUE,'پرس سینه هالتر').some(ex=>ex.id==='0025')).toBe(true)
})
it('resolves variant imports without duplicate picker rows and restores built-ins after custom overrides',()=>{
  const [alias,id]=Object.entries(EXALIAS)[0]
  expect(EXIDX[alias]).toBe(EXIDX[id])
  expect(CATALOGUE.some(ex=>ex.id===alias)).toBe(false)
  registerCustom([{id:'0025',custom:true,n:'نام خودم',st:['keep']}])
  expect(EXIDX['0025'].custom).toBe(true)
  expect(gifSrc(EXIDX['0025'])).toBeNull()
  registerCustom([])
  expect(EXIDX['0025'].n).toBe('barbell bench press')
  expect(EXIDX[alias].id).toBe(id)
})
it('supports five-digit media IDs and caps offline downloads with the active workout first',()=>{
  const ex=EXDB.find(e=>e.id.length===5)
  expect(imgSrc(ex)).toContain(ex.id+'.webp');expect(gifSrc(ex)).toContain(ex.id+'.mp4')
  const state={active:{entries:[{id:ex.id}]},routines:[{ex:EXDB.map(e=>({id:e.id}))}]}
  const before=JSON.stringify(state), urls=planMediaUrls(state,'https://test.invalid/')
  expect(urls).toHaveLength(MAX_PREFETCH_URLS)
  expect(urls[0]).toContain(ex.id)
  expect(new Set(urls).size).toBe(urls.length)
  expect(JSON.stringify(state)).toBe(before)
})
