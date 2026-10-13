// Display calendars never change the ISO dates used by history, scheduling and sync.
// Use the same Intl Persian calendar for formatting and reverse conversion, so leap days
// agree with the browser's calendar rather than a second, drifting arithmetic rule.
import { dateLocale, getLang } from './i18n-core.js'
import { latinDigits } from './numerals.js'

const DAY = 86400000
const persian = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  calendar: 'persian', numberingSystem: 'latn', timeZone: 'UTC',
  year: 'numeric', month: 'numeric', day: 'numeric',
})
const starts = new Map()
const pad = n => String(n).padStart(2, '0')
export const persianCalendar = () => getLang() === 'fa'
export const isoDate = d => `${String(d.getFullYear()).padStart(4, '0')}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export function validISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false
  const d = new Date(iso + 'T12:00:00')
  return Number.isFinite(+d) && isoDate(d) === iso
}
const utcParts = ms => Object.fromEntries(persian.formatToParts(new Date(ms))
  .filter(p => ['year', 'month', 'day'].includes(p.type)).map(p => [p.type, Number(p.value)]))
export function calendarParts(iso, usePersian = persianCalendar()) {
  if (!validISO(iso)) return null
  if (usePersian) return utcParts(Date.parse(iso + 'T12:00:00Z'))
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}
function yearStart(year) {
  if (starts.has(year)) return starts.get(year)
  // This picker covers contemporary training records (1200–1600 Persian).
  if (!Number.isInteger(year) || year < 1200 || year > 1601) return null
  let lo = Math.floor(Date.UTC(year + 621, 0, 1, 12) / DAY)
  let hi = Math.floor(Date.UTC(year + 621, 5, 1, 12) / DAY)
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (utcParts(mid * DAY + DAY / 2).year < year) lo = mid + 1
    else hi = mid
  }
  const ms = lo * DAY + DAY / 2
  const p = utcParts(ms)
  if (p.year !== year || p.month !== 1 || p.day !== 1) return null
  starts.set(year, ms)
  return ms
}
export function calendarISO(year, month, day, usePersian = persianCalendar()) {
  if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || day < 1 || day > 31) return null
  let iso
  if (usePersian) {
    const start = yearStart(year)
    if (start === null || year > 1600) return null
    const offset = month <= 7 ? (month - 1) * 31 : 186 + (month - 7) * 30
    iso = new Date(start + (offset + day - 1) * DAY).toISOString().slice(0, 10)
  } else iso = `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`
  const p = calendarParts(iso, usePersian)
  return p && p.year === year && p.month === month && p.day === day ? iso : null
}
export function calendarInput(iso, usePersian = persianCalendar()) {
  const p = calendarParts(iso, usePersian)
  return p ? `${p.year}/${pad(p.month)}/${pad(p.day)}` : ''
}
export function parseCalendarInput(raw, usePersian = persianCalendar()) {
  const s = latinDigits(raw).trim()
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return null
  return calendarISO(...s.split('/').map(Number), usePersian)
}
export function monthModel(iso, usePersian = persianCalendar()) {
  const p = calendarParts(iso, usePersian)
  if (!p) return null
  const first = calendarISO(p.year, p.month, 1, usePersian)
  if (!first) return null
  const nextMonth = p.month === 12 ? 1 : p.month + 1
  const nextYear = p.year + (p.month === 12 ? 1 : 0)
  // 1601-01-01 is allowed solely to close the final supported month.
  const next = usePersian && nextYear === 1601
    ? new Date(yearStart(1601)).toISOString().slice(0, 10)
    : calendarISO(nextYear, nextMonth, 1, usePersian)
  const days = Math.round((Date.parse(next + 'T12:00:00Z') - Date.parse(first + 'T12:00:00Z')) / DAY)
  const date = new Date(first + 'T12:00:00')
  return { ...p, first, next, days, weekday: date.getDay(),
    label: date.toLocaleDateString(dateLocale(), { year: 'numeric', month: 'long', calendar: usePersian ? 'persian' : 'gregory' }) }
}
export function shiftMonth(iso, offset, usePersian = persianCalendar()) {
  const p = calendarParts(iso, usePersian)
  if (!p) return null
  const count = p.year * 12 + p.month - 1 + offset
  return calendarISO(Math.floor(count / 12), (count % 12 + 12) % 12 + 1, 1, usePersian)
}
export function addDays(iso, count) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + count)
  return isoDate(d)
}
export const calendarDay = iso => new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { day: 'numeric' })
export const calendarMonthName = iso => new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), { month: 'short' })
