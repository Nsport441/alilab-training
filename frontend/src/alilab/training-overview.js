import { workoutDay, workoutDuration, workoutVolume, workSetsDone } from '../lib/history.js'

function shift(iso, amount) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + amount)
  const pad = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
const finite = n => Number.isFinite(n) && n >= 0 ? n : 0
export function trainingOverview(workouts = [], today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today || '') || workoutDay({d:today}) !== today) throw new Error('A valid local ISO day is required')
  const records = new Map()
  for (const [i,w] of (Array.isArray(workouts) ? workouts : []).entries()) {
    if (!w || !Array.isArray(w.entries)) continue
    records.set(typeof w.id === 'string' && w.id ? `id:${w.id}` : Symbol(i),w)
  }
  const start = shift(today,-27), previousStart = shift(today,-55)
  const summary = (from,to) => {
    const rows = [...records.values()].filter(w => {
      const d = workoutDay(w)
      return d && d >= from && d <= to && finite(workSetsDone(w)) > 0
    })
    return {sessions:rows.length, days:new Set(rows.map(workoutDay)).size,
      sets:rows.reduce((n,w)=>n+finite(workSetsDone(w)),0),
      minutes:rows.reduce((n,w)=>n+finite(workoutDuration(w))/60000,0),
      loadReps:rows.reduce((n,w)=>n+finite(workoutVolume(w)),0)}
  }
  const current = summary(start,today), previous = summary(previousStart,shift(start,-1))
  const change = Object.fromEntries(Object.keys(current).map(key=>[key,previous[key] > 0 ? (current[key]-previous[key])/previous[key]*100 : null]))
  return {from:start,to:today,current,previous,change}
}
