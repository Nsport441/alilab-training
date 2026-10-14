// @vitest-environment node
import { expect,it } from 'vitest'
import { trainingOverview } from './training-overview.js'
const workout=(id,d,sets,extra={})=>({id,d,entries:[{id:'0025',sets}],...extra})
it('uses inclusive local-day windows, actual completed work and canonical durations',()=>{
  const done={w:10,r:8,done:true}
  const rows=[workout('old','2026-09-16',[done]),workout('start','2026-09-17',[done]),workout('today','2026-10-14',[done,{w:50,r:10,done:false},{...done,phase:'warmup'}],{start:1000,end:601000,vol:999999}),workout('future','2026-10-15',[done]),workout('invalid','2026-02-30',[done]),workout('warm','2026-10-01',[{...done,phase:'warmup'}])]
  const r=trainingOverview(rows,'2026-10-14')
  expect(r.current).toEqual({sessions:2,days:2,sets:2,minutes:10,loadReps:160})
  expect(r.previous.sessions).toBe(1);expect(r.change.sessions).toBe(100);expect(r.change.minutes).toBeNull()
})
it('counts completed unilateral limbs at their own loads and deduplicates IDs',()=>{
  const set={sides:{L:{w:10,r:8,done:true},R:{w:20,r:9,done:false}},w:20,r:17,done:true}
  const row=workout('same','2026-10-14',[set]),r=trainingOverview([row,row],'2026-10-14')
  expect(r.current.sets).toBe(1);expect(r.current.loadReps).toBe(80);expect(r.current.sessions).toBe(1)
})
it('handles no observations and rejects invalid anchor dates',()=>{
  expect(trainingOverview([],'2026-10-14').change.sets).toBeNull()
  expect(()=>trainingOverview([],'2026-02-30')).toThrow()
})
