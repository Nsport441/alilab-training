import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtNum, fmtVol, fmtDur } from '../lib/format.js'
import { dateLocale } from '../lib/i18n-core.js'
import { auditCat, auditLine, fmtWhen } from '../lib/audit.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import AdminCoach from './AdminCoach.jsx'
import { ReleaseCenter, SystemHealth } from './AdminOperations.jsx'
import '../admin.css'
import { adminText } from '../alilab/admin-i18n.js'

// Admin-only operator dashboard (owner passkey + admin flag; guarded again server-side).
// Admin strings are localized separately from the end-user interface.
//
// One page of cards, each opening with a sentence that says what it is for. An operator who
// looks at this twice a year should not have to remember what "synced 3d ago" or an invite
// code means.

const rel = ts => {
  if (!ts) return adminText('never')
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return adminText('just now')
  if (s < 3600) return Math.floor(s / 60) + adminText(' min ago')
  if (s < 86400) return Math.floor(s / 3600) + adminText(' h ago')
  return Math.floor(s / 86400) + adminText(' d ago')
}
const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? m + adminText(' min') : Math.floor(m / 60) + adminText(' h ') + (m % 60) + adminText(' min') }

// The one time the reset code is visible. Locked, so a tap beside the sheet cannot lose it
// before it has been copied or written down.
function ResetCodeSheet({ name, email, code, expires, close }) {
  const toast = useUI(s => s.toast)
  const copy = () => { navigator.clipboard?.writeText(code).catch(() => {}); toast(adminText('Copied')) }
  return <>
    <h3>{adminText("Reset code for ")}{name}</h3>
    <div className="adm-lead">{adminText("Give them this code. They choose “Sign in with password” → “Have a reset code from your admin?”, enter their name ")}<b>{name}</b>{email && <>{adminText(" (or their sign-in e-mail ")}<b>{email}</b>)</>}{adminText(', the code and a new password. It works once, until ')}{new Date(expires).toLocaleString(dateLocale())}{adminText(", and will not be shown again.")}</div>
    <button className="adm-code" style={{ fontSize: 22, width: '100%', padding: '14px 0' }} onClick={copy} aria-label={adminText("copy code")}>{code}</button>
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={close}>{adminText("Done")}</Button>
  </>
}

function UserDetail({ id, onChanged, close }) {
  const [d, setD] = useState(null)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  useEffect(() => { api('/api/admin/user?id=' + encodeURIComponent(id)).then(setD).catch(e => toast(e.message)) }, [id])
  if (!d) return <div className="muted small">{adminText("Loading…")}</div>
  const u = d.user
  // The document comes straight off the user's state file. PUT /api/data drops null and
  // shapeless entries now, but a file written before it did still answers with them, and this
  // sheet renders outside the route's ErrorBoundary: one throw here blanked the whole app and
  // left exactly this account un-disableable. setsDone/workoutVolume walk entries and sets, so
  // an entry that lacks either has nothing to show and is skipped rather than drawn.
  const workouts = (d.workouts || []).filter(w => w && Array.isArray(w.entries) && w.entries.every(e => e && Array.isArray(e.sets)))
  // Their whole record as the admin API already returns it — the export the delete sheet offers.
  const exportUser = () => {
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `opengym-${u.name.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}-${u.id}.json`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const doDelete = () => {
    api('/api/admin/user/delete', { method: 'POST', body: JSON.stringify({ id: u.id }) })
      .then(() => { toast(adminText('Account deleted')); onChanged(); close() })
      .catch(e => toast(e.message))
  }
  const setDisabled = disabled => {
    api('/api/admin/user/disable', { method: 'POST', body: JSON.stringify({ id: u.id, disabled }) })
      .then(() => { toast(adminText(disabled ? 'User disabled' : 'User enabled')); onChanged(); close() })
      .catch(e => toast(e.message))
  }
  // Password sign-in (#118): the server only sends `password` when the instance offers it. The
  // code comes back once, is shown once, and is never stored anywhere but as a hash.
  const pwInstance = typeof u.password === 'boolean'
  const resetPassword = () => confirmSheet({
    title: adminText('Reset ') + u.name + adminText('’s password?'),
    message: adminText("You get a one-time reset code. Their current password stops working and all sessions end. They set a new password under “Sign in with password”. The code is shown once and is valid for 24 hours."),
    confirmText: adminText("Create reset code"),
    danger: true,
    onConfirm: () => api('/api/admin/user/password-reset', { method: 'POST', body: JSON.stringify({ id: u.id }) })
      .then(r => { onChanged(); close(); openSheet(done => <ResetCodeSheet name={r.name} email={u.email} code={r.code} expires={r.expires} close={done} />, { locked: true }) })
      .catch(e => toast(e.message)),
  })
  return <>
    <h3 className="capitalize">{u.name}</h3>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '8px 0 12px' }}>
      {u.admin && <span className="adm-pill acc">{adminText("admin")}</span>}
      {u.disabled && <span className="adm-pill bad">{adminText("disabled")}</span>}
      {u.password && <span className="adm-pill">{adminText("password")}</span>}
      {/* The sign-in e-mail (password instances only): shown to admins and nobody else. */}
      {u.email && <span className="adm-pill" title={adminText("sign-in e-mail")}>{u.email}</span>}
      {u.resetUntil && <span className="adm-pill acc">{adminText("reset code until ")}{new Date(u.resetUntil).toLocaleString(dateLocale())}</span>}
      <span className="adm-pill">{adminText("joined ")}{u.created ? fmtDate(u.created.slice(0, 10)) : '—'}</span>
    </div>
    <div className="tiles" style={{ textAlign: 'start' }}>
      <div className="tile"><div className="l">{adminText("Workouts")}</div><div className="v" style={{ fontSize: '1.1rem' }}>{workouts.length}</div></div>
      <div className="tile"><div className="l">{adminText("Weigh-ins")}</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.bodyweight.length}</div></div>
      <div className="tile"><div className="l">{adminText("Routines")}</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.routines.length}</div></div>
      <div className="tile"><div className="l">{adminText("Last sync")}</div><div className="v" style={{ fontSize: '.95rem' }}>{rel(d.lastSync)}</div></div>
    </div>
    {!u.admin && <>
      <button className={'btn ' + (u.disabled ? 'primary' : 'danger')} style={{ margin: '12px 0 4px' }}
        onClick={() => u.disabled ? setDisabled(false)
          : confirmSheet({ title: adminText('Disable ') + u.name + adminText('?'), message: adminText("They are signed out everywhere and can no longer sync or log in until re-enabled. Their data stays."), confirmText: adminText("Disable"), danger: true, onConfirm: () => setDisabled(true) })}>
        {adminText(u.disabled ? 'Enable account' : 'Disable account')}</button>
      <div className="adm-hint">{adminText(u.disabled ? 'Enabling lets them sign in and sync again.' : 'Disabling signs them out everywhere and blocks sign-in. Nothing is deleted.')}</div>
      {/* The one destructive action in the app (issue #107), so it asks twice and offers the
          export first — that history is theirs. The second step names the account again, because
          the first sheet can be dismissed by anyone who was not reading. */}
      <button className="btn danger" style={{ margin: '14px 0 4px' }}
        onClick={() => confirmSheet({
          title: adminText('Delete ') + u.name + adminText('?'),
          message: adminText("Their workouts, weigh-ins, routines, password and notifications will be deleted. This cannot be undone. Download their data first if they might want it."),
          confirmText: adminText("Continue"),
          danger: true,
          onConfirm: () => confirmSheet({
            title: adminText('Delete ') + u.name + adminText(' for good?'),
            message: adminText("Last chance — there is no undo and no backup of this on the server."),
            confirmText: adminText("Delete account"),
            danger: true,
            onConfirm: doDelete,
          }),
        })}>{adminText("Delete account")}</button>
      <button className="btn" style={{ marginBottom: 4 }} onClick={exportUser}>{adminText("Download their data")}</button>
      <div className="adm-hint">{adminText("Deleting removes the account and every trace of its training history from this server.")}</div>
      {pwInstance && <>
        <button className="btn" style={{ margin: '14px 0 4px' }} onClick={resetPassword}>{adminText("Reset password")}</button>
        <div className="adm-hint">{u.password
          ? adminText('For a forgotten password: a one-time code lets them choose a new one. Their current password stops working at once.')
          : adminText('No password yet. A one-time reset code lets them set one.')}</div>
      </>}
    </>}
    <h4 className="sec">{adminText("Workout history")}</h4>
    {workouts.length ? <div className="list" style={{ gap: 0 }}>
      {workouts.slice(0, 60).map(w => <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div><div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {setsDone(w)}{adminText(" sets")}{w.prs?.length ? ' · ' + w.prs.length + ' PR' : ''}</div></div>
        <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), d.unit)}</span>
      </div>)}
    </div> : <div className="adm-empty">{adminText("No workouts logged.")}</div>}
  </>
}

// Who signed in, who tried and failed, what an admin changed. A card rather than its own route:
// the dashboard is deliberately one page of cards, and the 95 % use of this is a glance at the
// last twenty events. Paging follows Library.jsx's house style — adminText("Show more"), not page numbers.
function AuditCard({ tick }) {
  const toast = useUI(s => s.toast)
  const [meta, setMeta] = useState(null)      // last response minus the rows: total, retention, …
  const [rows, setRows] = useState([])
  const [cat, setCat] = useState('')

  const load = (c, before) => api('/api/admin/audit?limit=50&cat=' + c + (before ? '&before=' + before : ''))
    .then(r => { setMeta(r); setRows(x => (before ? x.concat(r.events) : r.events)) })
    .catch(e => toast(e.message))
  const pick = c => { setCat(c); setRows([]); setMeta(null); load(c) }
  // Reloads on mount and whenever the header's ↻ bumps the tick. Deliberately not on the 15s
  // poll that drives "training now": this is history, not presence.
  useEffect(() => { load(cat) }, [tick])

  const clear = () => confirmSheet({
    title: adminText('Clear the activity log?'),
    message: adminText("Every recorded event is deleted. The clear itself is logged, so the gap stays visible."),
    confirmText: adminText("Clear"), danger: true,
    onConfirm: () => api('/api/admin/audit/clear', { method: 'POST', body: '{}' })
      .then(() => { toast(adminText('Activity log cleared')); pick(cat) }).catch(e => toast(e.message))
  })

  if (meta && !meta.enabled) return null      // AUDIT_LOG=0 — the card isn't there at all

  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{adminText("Activity log")}</h2>
      <button className="iconbtn adm-iconbtn" style={{ color: 'var(--red)' }} onClick={clear} aria-label={adminText("clear log")}><Icon name="trash" /></button></div>
    <div className="adm-lead">
      {adminText("Who signed in, what failed, and what an admin changed.")}
      {meta ? ' ' + fmtNum(meta.total) + adminText(' events')
        + (meta.retention.days ? adminText(", kept for ") + meta.retention.days + adminText(' days') : '')
        + (meta.ip_mode === 'off' ? adminText(", without IP addresses") : '') + '.' : ''}
    </div>
    <div className="chips" style={{ marginBottom: 10 }}>
      {[['', 'All'], ['auth', 'Sign-ins'], ['admin', adminText("Admin")], ['fail', adminText("Failed")]].map(([v, l]) =>
        <button key={v} className={'chip' + (cat === v ? ' on' : '')} onClick={() => pick(v)}>{adminText(l)}</button>)}
    </div>
    {rows.map(e => {
      const line = auditLine(e)
      return <div key={e.id} className="row between" style={{ padding: '8px 2px', borderBottom: 'var(--hair) solid var(--sep)' }}>
        <div className="grow">
          <div className="small" style={{ fontWeight: 600 }}>{adminText(line.title)}
            {/* a red pill, not a red row: twenty fumbled Face IDs in a row shouldn't read as an incident */}
            {!e.ok && <span className="adm-pill bad" style={{ marginInlineStart: 6 }}>{adminText("failed")}</span>}
            {auditCat(e.ev) === 'admin' && <span className="adm-pill acc" style={{ marginInlineStart: 6 }}>{adminText("admin")}</span>}</div>
          {line.sub && <div className="dim" style={{ fontSize: '.72rem' }}>{adminText(line.sub)}</div>}
        </div>
        <span className="small muted" style={{ flex: 'none', marginInlineStart: 8 }}>{fmtWhen(e.ts, meta?.now)}</span>
      </div>
    })}
    {meta && !rows.length && <div className="adm-empty">{adminText("Nothing logged yet.")}</div>}
    {meta?.nextBefore && <div style={{ marginTop: 10 }}>
      <Button size="sm" onClick={() => load(cat, meta.nextBefore)}>{adminText("Show more")}</Button></div>}
  </div>
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const openSheet = useUI(s => s.openSheet)
  const [users, setUsers] = useState(null)
  const [usersErr, setUsersErr] = useState(null)   // why the last load failed, until one succeeds
  const [tick, setTick] = useState(0)          // the ↻ button; the activity log listens to it

  // A failed load, or an answer without a list, used to leave the page on "Loading…" for good —
  // with a toast every 15 seconds from the poll, or with nothing at all when the answer was
  // someone else's page. It says so where the list would be instead, and the poll (or ↻) keeps
  // trying; a list that did load stays up, marked as the last one that came through.
  const loadUsers = () => api('/api/admin/users')
    .then(d => {
      if (!Array.isArray(d?.users)) throw new Error(adminText("The server answered without a list of users."))
      setUsers(d.users); setUsersErr(null)
    })
    .catch(e => setUsersErr(e.message || adminText("Failed to load")))
  // poll every 15s so the "training now" section stays live without a manual refresh
  useEffect(() => { if (!user?.admin) return; loadUsers(); const iv = setInterval(loadUsers, 15000); return () => clearInterval(iv) }, [])
  if (!user?.admin) return null

  const openUser = id => openSheet(close => <UserDetail id={id} onChanged={loadUsers} close={close} />)
  const liveUsers = (users || []).filter(u => u.live)
  const activeCount = (users || []).filter(u => u.lastSync && Date.now() - u.lastSync < 7 * 86400000).length
  const disabledCount = (users || []).filter(u => u.disabled).length

  return <div className="narrow" dir="rtl" lang="fa">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={adminText("Back")}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 8 }}><h1 style={{ margin: 0 }}>{adminText("Admin")}</h1>
        <div className="sub">{users ? users.length + adminText(' users · ') + activeCount + ' ' + adminText('active this week') : usersErr ? adminText('Could not load') : adminText('Loading…')}</div></div>
      <button className="iconbtn" onClick={() => { loadUsers(); setTick(n => n + 1) }} aria-label={adminText("refresh")}>↻</button>
    </div>
    <div className="adm-intro">
      {adminText("Everything about running this instance: who uses it, how they get in, the AI Coach, and what has happened on it. Nothing here shows anyone's training data beyond counts.")}
    </div>

    {usersErr && <div className="card" role="alert" style={{ borderColor: 'var(--red)' }}>
      <div className="row between"><h2 style={{ margin: 0 }}>{users ? adminText("The last update failed") : adminText("Could not load the users")}</h2>
        <Button size="sm" icon="reset" onClick={loadUsers}>{adminText("Try again")}</Button></div>
      <div className="adm-lead" style={{ marginBottom: 0 }}>
        {adminText(usersErr)} {users ? adminText("The list below is the last one that loaded.") : adminText("It tries again every 15 seconds.")}
      </div>
    </div>}

    <details className="adm-group" open><summary>داشبورد</summary>
    <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">{adminText("Users")}</div><div className="v">{users ? users.length : '—'}</div></div>
      <div className="tile"><div className="l">{adminText("Training now")}</div><div className="v" style={{ color: liveUsers.length ? 'var(--acc)' : undefined }}>{users ? liveUsers.length : '—'}</div></div>
      <div className="tile"><div className="l">{adminText("Active 7 days")}</div><div className="v">{users ? activeCount : '—'}</div></div>
      <div className="tile"><div className="l">{adminText("Disabled")}</div><div className="v">{users ? disabledCount : '—'}</div></div>
    </div>

    {liveUsers.length > 0 && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="row" style={{ margin: '0 0 2px', gap: 6 }}><Icon name="dot" style={{ fontSize: 10, color: 'var(--green)' }} />{adminText("Training now")}</h2>
      <div className="adm-lead">{adminText("Sessions running at this moment. Tap a name for details.")}</div>
      {liveUsers.map(u => <div key={u.id} className="row between" style={{ padding: '8px 2px', borderBottom: 'var(--hair) solid var(--sep)' }} onClick={() => openUser(u.id)}>
        <div><div className="small" style={{ fontWeight: 600 }}>{u.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{u.live.name}{adminText(" · exercise ")}{u.live.exIdx}{adminText(" of ")}{u.live.exTotal} · {u.live.setsDone}/{u.live.setsTotal}{adminText(" sets")}</div></div>
        <span className="adm-pill acc">{dur(Date.now() - u.live.startedAt)}</span>
      </div>)}
    </div>}

    </details>
    <details className="adm-group" open><summary>کاربران و مربیان</summary>
    <AdminCoach />

    <div className="card">
      <h2 style={{ margin: 0 }}>{adminText("Users")}</h2>
      <div className="adm-lead">{adminText("Everyone with a profile on this instance. Tap one to see their activity, to disable the account (nothing is deleted) or to delete it with all their data for good.")}</div>
      <div className="list">
        {(users || []).map(u => <div key={u.id} className="item" onClick={() => openUser(u.id)} style={u.disabled ? { opacity: .55 } : null}>
          <div className="grow"><div className="tt">{u.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)', display: 'inline-block', marginInlineEnd: 5 }} />}{u.name} {u.admin && <span className="adm-pill acc" style={{ marginInlineStart: 4 }}>{adminText("admin")}</span>}{u.disabled && <span className="adm-pill bad" style={{ marginInlineStart: 4 }}>{adminText("disabled")}</span>}</div>
            <div className="ss">{u.live ? adminText('training now · ') + u.live.name : u.workouts + ' ' + adminText('workouts') + (u.lastWorkout ? adminText(' · last ') + fmtDate(u.lastWorkout) : '') + adminText(' · last sync ') + rel(u.lastSync)}</div>
            {u.email && <div className="ss" title={adminText("sign-in e-mail")}>{u.email}</div>}</div>
          {u.hasPush && <Icon name="bell" title={adminText("push notifications on")} style={{ fontSize: 15, color: 'var(--label-3)' }} />}<Icon name="chevronRight" className="chev" />
        </div>)}
        {users && !users.length && <div className="adm-empty">{adminText("No users yet.")}</div>}
      </div>
    </div>

    </details>
    <details className="adm-group"><summary>تمرینات و محتوا</summary>
      <div className="card"><h2>کتابخانه تمرینات</h2>
        <p className="adm-lead">مشاهده و مدیریت تمرینات شخصی با امکانات فعلی کتابخانه.</p>
        <Button onClick={() => nav('/library')}>باز کردن کتابخانه</Button>
      </div>
    </details>
    <details className="adm-group" open><summary>گزارش‌ها و پایش</summary>
      <SystemHealth tick={tick} />
      <div style={{ marginTop: 14 }}><AuditCard tick={tick} /></div>
    </details>
    <details className="adm-group" open><summary>سیستم و تنظیمات</summary>
      <ReleaseCenter tick={tick} />
      <Button onClick={() => nav('/settings')}>تنظیمات حساب و برنامه</Button>
    </details>
  </div>
}
