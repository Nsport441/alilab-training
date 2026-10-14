import { trainingOverview } from './training-overview.js'
import { alilabText } from './copy.js'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'

export default function TrainingOverview({ S }) {
  const o = trainingOverview(S.workouts,todayISO())
  const metrics=[['sessions','Completed sessions'],['days','Training days'],['sets','Work sets'],['minutes','Recorded minutes'],['loadReps','Recorded load × reps']]
  return <section className="card training-overview" aria-label={alilabText('Training overview — 28 days')}>
    <h2>{alilabText('Training overview — 28 days')}</h2>
    <div className="muted small">{fmtDate(o.from,true)} — {fmtDate(o.to,true)}</div>
    <dl className="overview-metrics">{metrics.map(([key,label])=><div key={key}>
      <dt>{alilabText(label)}</dt><dd>{fmtNum(Math.round(o.current[key]*10)/10)}{key==='loadReps' && <span className="small dim"> {S.unit} × {alilabText('reps')}</span>}</dd>
      <div className="small muted">{alilabText('Previous 28 days')}: {fmtNum(Math.round(o.previous[key]*10)/10)}</div>
      <div className="small dim">{o.change[key] === null ? alilabText('Not enough comparable data') : `${o.change[key]>0?'+':''}${fmtNum(Math.round(o.change[key]*10)/10)}%`}</div>
    </div>)}</dl>
    <p className="small muted">{alilabText('Warm-ups and unfinished work are excluded. Bodyweight is not added to recorded load.')}</p>
    <p className="small dim">{alilabText('Observed records only; this does not estimate recovery or prescribe training.')}</p>
  </section>
}
