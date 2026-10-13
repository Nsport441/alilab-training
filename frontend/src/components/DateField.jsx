import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { dateLocale } from '../lib/i18n-core.js'
import { DAYN, weekOrder, weekDayOffset } from '../lib/format.js'
import { addDays, calendarInput, calendarISO, monthModel, parseCalendarInput, persianCalendar, shiftMonth, validISO } from '../lib/calendar.js'
import { latinDigits } from '../lib/numerals.js'
import { Button, SelectRow, NumberField } from './ui.jsx'
import Icon from './Icon.jsx'

export function DatePicker({ value, max, onPick, close }) {
  const seed = monthModel(value) ? value : monthModel(max) ? max : new Date().toISOString().slice(0, 10)
  const [cur, setCur] = useState(seed)
  const model = monthModel(cur)
  const [year, setYear] = useState(model.year)
  const move = offset => {
    const next = shiftMonth(cur, offset)
    if (next) { setCur(next); setYear(monthModel(next).year) }
  }
  const months = Array.from({ length: 12 }, (_, i) => {
    const iso = calendarISO(model.year, i + 1, 1)
    return { value: i + 1, label: new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { month: 'long' }) }
  })
  return <div className="date-picker">
    <h3>{t('Date')}</h3>
    <div className="row between">
      <button className="iconbtn" aria-label={t('Previous month')} onClick={() => move(-1)} disabled={!shiftMonth(cur, -1)}><Icon name="chevronLeft" /></button>
      <strong>{model.label}</strong>
      <button className="iconbtn" aria-label={t('Next month')} onClick={() => move(1)} disabled={!shiftMonth(cur, 1)}><Icon name="chevronRight" /></button>
    </div>
    <SelectRow title={t('Month')} options={months} value={model.month} onChange={v => setCur(calendarISO(model.year, v, 1))} />
    <div className="row between"><span>{t('Year')}</span><NumberField aria-label={t('Year')} aria-invalid={year < 1200 || year > 1600} value={year} decimal={false} onBlur={() => setYear(model.year)}
      onChange={v => { setYear(v); if (v >= 1200 && v <= 1600) setCur(calendarISO(v, model.month, 1)) }} /></div>
    <div className="cal-grid">
      {weekOrder(6).map(d => <div key={d} className="cal-h">{t(DAYN[d])}</div>)}
      {Array.from({ length: weekDayOffset(model.weekday, 6) }, (_, i) => <div key={'blank' + i} />)}
      {Array.from({ length: model.days }, (_, i) => {
        const iso = addDays(model.first, i)
        return <button key={iso} className={'cal-d' + (iso === value ? ' today' : '')}
          aria-label={calendarInput(iso)} aria-pressed={iso === value} disabled={!!max && iso > max}
          onClick={() => { onPick(iso); close() }}>{(i + 1).toLocaleString(dateLocale())}</button>
      })}
    </div>
    <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
  </div>
}

export default function DateField({ value, onChange, max }) {
  const fa = persianCalendar()
  const [draft, setDraft] = useState(() => calendarInput(value))
  useEffect(() => { if (validISO(value)) setDraft(calendarInput(value)) }, [value, fa])
  if (!fa) return <input type="date" aria-label={t('Date')} className="timef" value={value} max={max} onChange={e => onChange(e.target.value)} />
  const parsed = parseCalendarInput(draft)
  const valid = !!parsed && (!max || parsed <= max)
  return <div className="date-field">
    <input className="timef" aria-label={t('Date')} aria-invalid={!valid} title={!valid ? t('Pick a day up to today') : undefined} placeholder="YYYY/MM/DD" dir="ltr"
      value={draft} maxLength={10} onChange={e => {
        const raw = latinDigits(e.target.value)
        setDraft(raw)
        const iso = parseCalendarInput(raw)
        onChange(iso && (!max || iso <= max) ? iso : '')
      }} />
    <button type="button" className="iconbtn" aria-label={t('Calendar')} onClick={() => useUI.getState().openSheet(close =>
      <DatePicker value={value} max={max} onPick={onChange} close={close} />)}><Icon name="calendar" /></button>
  </div>
}
