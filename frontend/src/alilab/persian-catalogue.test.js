// @vitest-environment node
import { afterEach, expect,it } from 'vitest'
import { EXDB,matchExercise } from '../lib/exercises.js'
import { _setLangState,exerciseNameFor,instrFor,englishInstructionsFor,hasLocalizedInstructions } from '../lib/i18n-core.js'
import legacy from '../../../catalogue/legacy.json' with { type: 'json' }
import batch16 from '../../../catalogue/persian-batch-16-review.json' with { type: 'json' }
import additions from './persian-batch-01.json' with { type: 'json' }
import reviews from './exercise-guide-reviews.json' with { type: 'json' }
import { exerciseGuideReview } from './exercise-guide-reviews.js'
import names from '../exercise-names/fa.js'
import guides from '../instr/fa.js'
import legacyGuides from '../instr/fa-legacy.json' with { type: 'json' }
import legacyEnglish from './legacy-english-instructions.json' with { type: 'json' }
import fa from '../locales/fa.js'
afterEach(()=>_setLangState('en'))
it('covers stable IDs, retains bilingual search and leaves custom names intact',()=>{
  expect(Object.keys(names).sort()).toEqual([...legacy.map(ex=>ex.id),...Object.keys(additions),...Object.keys(reviews)].sort())
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
  expect(Object.keys(guides)).toHaveLength(legacy.length + Object.keys(additions).length)
  _setLangState('fa',fa,guides,names)
  const translated=EXDB.find(ex=>guides[ex.id])
  const fallback={id:'untranslated-fixture',st:['Keep the original instructions.']}
  expect(hasLocalizedInstructions(translated)).toBe(true)
  expect(instrFor(translated)).toBe(guides[translated.id])
  expect(hasLocalizedInstructions(fallback)).toBe(false)
  expect(instrFor(fallback)).toBe(fallback.st)
})
it('maps the 1044 full Persian guides to their original legacy steps', () => {
  const shortIds = legacy.map(row => row.id).filter(id => guides[id]?.[0]?.startsWith('راهنمای کوتاه «'))
  expect(shortIds).toHaveLength(280)
  expect(Object.keys(legacyGuides).sort()).toEqual(legacy.map(row => row.id).filter(id => !shortIds.includes(id)).sort())
  expect(Object.keys(legacyEnglish)).toHaveLength(68)
  expect(Object.keys(legacyEnglish).every(id => Object.hasOwn(legacyGuides,id))).toBe(true)
  const source = new Map(EXDB.map(row => [row.id, row]))
  const numbers = text => [...text.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).matchAll(/\d+/g)].map(match => match[0])
  _setLangState('fa', fa, guides, names)
  for (const [id, steps] of Object.entries(legacyGuides)) {
    const exercise = source.get(id)
    const english = englishInstructionsFor(exercise)
    expect(steps, id).toHaveLength(english.length)
    expect(steps.every(step => /[آ-ی]/.test(step)), id).toBe(true)
    expect(steps.map(numbers), id).toEqual(english.map(numbers))
    expect(hasLocalizedInstructions(exercise), id).toBe(true)
    expect(instrFor(exercise), id).toEqual(steps)
  }
  _setLangState('en')
  expect(instrFor(source.get('0001'))).toBe(source.get('0001').st)
  expect(instrFor(source.get('0764'))[1]).toContain('underhand')
  expect(source.get('0764').st[2]).toContain('overhand')
  expect(instrFor(source.get('0067'))[1]).toContain('one hand')
  expect(instrFor(source.get('0776'))[2]).toContain('shrug')
  expect(instrFor({ id:'0764',custom:true,st:['My own instructions'] })).toEqual(['My own instructions'])
})
it('preserves the working foot and chest-down setup in Persian', () => {
  _setLangState('fa', fa, guides, names)
  const calfPress = instrFor(EXDB.find(ex => ex.id === '1392'))
  expect(calfPress[1]).toMatch(/پنجهٔ یک پا.*پای دیگر را روی صفحه نگذارید/)
  expect(calfPress[2]).toContain('ضامن‌های ایمنی')
  for (const id of ['1317', '1628', '1667', '1675']) {
    expect(instrFor(EXDB.find(ex => ex.id === id))[0], id).toMatch(/دمر.*نیمکت.*سینه/)
  }
})
it('offers bilingual guides or competition rules for all 15 reviewed records', () => {
  expect(Object.keys(reviews).sort()).toEqual(Object.keys(batch16.deferred_reasons).sort())
  expect(Object.keys(reviews)).toHaveLength(15)
  expect(Object.keys(additions)).toHaveLength(4293)
  expect(Object.keys(reviews).filter(id => reviews[id].stepsFa)).toEqual([
    '3188', '3317', '4466', '4475', '4476', '4477', '4479', '4482', '4599', '6767', '6768',
    '10559', '10560', '10597', '11652',
  ])
  expect(Object.keys(reviews).filter(id => reviews[id].kind === 'competition')).toEqual(['3317'])
  _setLangState('fa', fa, guides, names)
  for (const [id, review] of Object.entries(reviews)) {
    const exercise = EXDB.find(ex => ex.id === id)
    expect(exercise.st.length, id).toBeGreaterThan(0)
    expect(exerciseGuideReview(exercise), id).toBe(review)
    expect(review.nameFa, id).toMatch(/[آ-ی]/)
    expect(review.summaryFa, id).toMatch(/[آ-ی]/)
    expect(review.summaryEn, id).toMatch(/[A-Za-z]/)
    expect(new URL(review.source).protocol, id).toBe('https:')
    expect(exerciseNameFor(exercise), id).toContain(review.nameFa)
    expect(matchExercise(exercise, review.nameFa), id).toBe(true)
    expect(matchExercise(exercise, exercise.n), id).toBe(true)
    expect(instrFor(exercise), id).toEqual(review.stepsFa ?? [])
    expect(hasLocalizedInstructions(exercise), id).toBe(Boolean(review.stepsFa))
    expect(review.stepsFa?.length, id).toBe(review.stepsEn?.length)
  }
  _setLangState('en')
  const competition = EXDB.find(ex => ex.id === '3317')
  expect(instrFor(competition)[1]).toContain('60 seconds')
  expect(instrFor(competition)[2]).toContain('roll-stop bar')
  const knee = EXDB.find(ex => ex.id === '4466')
  expect(instrFor(knee).at(-1)).toMatch(/stop.*tingling/)
  const abdominal = EXDB.find(ex => ex.id === '4479')
  expect(instrFor(abdominal).at(-1)).toContain('10 seconds')
  const rotation = EXDB.find(ex => ex.id === '10597')
  expect(instrFor(rotation)[2]).toMatch(/Keep hold of the handle.*external rotation/)
  expect(instrFor(rotation)[3]).toMatch(/Control and stop.*rotate/)
  const raise = EXDB.find(ex => ex.id === '10559')
  expect(instrFor(raise)[0]).toContain('both hands')
  expect(instrFor(raise)[2]).toContain('Steady the weight at the top with both hands')
  const press = EXDB.find(ex => ex.id === '10560')
  expect(instrFor(press)[2]).toMatch(/stop just above your chest.*hands closed/)
  const pullover = EXDB.find(ex => ex.id === '3188')
  expect(instrFor(pullover)[0]).toMatch(/coach.*check how the band and load are secured/)
  expect(instrFor(pullover).at(-1)).toMatch(/starts swinging.*stop with the coach's help/)
  const scalene = EXDB.find(ex => ex.id === '6767')
  const scaleneSideView = EXDB.find(ex => ex.id === '6768')
  expect(instrFor(scalene)).toEqual(instrFor(scaleneSideView))
  expect(instrFor(scalene)[1]).toMatch(/physiotherapist.*controls its contact point and pressure/)
  expect(instrFor(scalene)[1]).toContain('weight of your head on the support')
  const clinical = EXDB.find(ex => ex.id === '11652')
  expect(exerciseNameFor(clinical)).toBe(clinical.n)
  expect(instrFor(clinical)).toEqual(reviews['11652'].stepsEn)
  expect(instrFor(clinical)[1]).toMatch(/extend the knee.*lift your gaze/)
  expect(instrFor(clinical)[2]).toMatch(/bend the knee.*bring your chin down/)
  expect(hasLocalizedInstructions(clinical)).toBe(true)
  _setLangState('fa', fa, guides, names)
  expect(instrFor(scalene)).toEqual(instrFor(scaleneSideView))
  expect(instrFor(scalene)[1]).toContain('درمانگر توپ، محل تماس و شدت فشار را تعیین و کنترل می‌کند')
  expect(instrFor(clinical)[1]).toMatch(/زانو را صاف کنید.*نگاهتان را بالا ببرید/)
  expect(instrFor(clinical)[2]).toMatch(/زانو را خم کنید.*چانه را به سمت سینه پایین بیاورید/)
  _setLangState('de')
  expect(instrFor(clinical)).toEqual(reviews['11652'].stepsEn)
  expect(hasLocalizedInstructions(clinical)).toBe(false)
  const custom = { ...clinical, custom: true, st: ['My own instructions'] }
  expect(exerciseGuideReview(custom)).toBeNull()
  expect(instrFor(custom)).toEqual(custom.st)
})
it('keeps every new translated instruction aligned with its reviewed source',()=>{
  const exercisesById = new Map(EXDB.map(ex => [ex.id, ex]))
  const numericCorrections = new Map(batch16.records.map(record => [record.id, record.numeric_media_overrides]))
  const numbers = text => [...text.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).matchAll(/\d+/g)].map(m=>m[0])
  for(const [id,entry] of Object.entries(additions)) {
    const ex = exercisesById.get(id)
    expect(ex, id).toBeDefined()
    expect(entry.name).toMatch(/[\u0600-\u06ff]/)
    expect(entry.instructions).toHaveLength(ex.st.length)
    expect(entry.instructions.every(step=>/[\u0600-\u06ff]/.test(step))).toBe(true)
    const corrections = numericCorrections.get(id)
    const expected = ex.st.map((step, i) => corrections?.[i + 1] ?? numbers(step))
    expect(entry.instructions.map(numbers), id).toEqual(expected)
  }
})
