import { afterEach, describe, expect, it } from 'vitest'
import { _setLangState, dateLocale, RTL_LANGS, LANGS, baseLang, t } from './i18n-core.js'
import { CALENDAR_LABELS } from '../locales/common/calendar.js'
import fa from '../locales/fa.js'
import { addDays, calendarISO, calendarParts, calendarInput, parseCalendarInput, monthModel, shiftMonth } from './calendar.js'
import { fmtDate, fmtDateRange, weekKey, weekOrder, weekStartOf } from './format.js'
import { latinDigits, numericInput } from './numerals.js'
import { matchLocale } from './default-lang.js'

afterEach(() => _setLangState('en', {}, null, null))
const persian = () => _setLangState('fa', fa, null, null)

describe('Persian date boundaries', () => {
  it.each([
    [1399, 12, 30, '2021-03-20'], [1400, 1, 1, '2021-03-21'],
    [1403, 12, 30, '2025-03-20'], [1404, 1, 1, '2025-03-21'],
    [1404, 12, 29, '2026-03-20'], [1405, 1, 1, '2026-03-21'],
    [1405, 7, 21, '2026-10-13'],
  ])('round-trips %i/%i/%i to the same stored ISO day', (year, month, day, iso) => {
    expect(calendarISO(year, month, day, true)).toBe(iso)
    expect(calendarParts(iso, true)).toEqual({ year, month, day })
  })
  it('rejects overflow, non-leap Esfand and malformed input instead of rolling forward', () => {
    persian()
    for (const value of ['1404/12/30', '1405/07/31', '1405/00/01', '1405/13/01', '1405/01/00', '1405/1/01', '1405/01/011', '1405/ab/01', '120/01/01']) {
      expect(parseCalendarInput(value), value).toBeNull()
    }
    expect(parseCalendarInput('۱۴۰۵/۰۷/۲۱')).toBe('2026-10-13')
    expect(parseCalendarInput('١٤٠٥/٠٧/٢١')).toBe('2026-10-13')
  })
  it('round-trips every day across a full leap year and Nowruz', () => {
    for (let i = 0; i < 400; i++) {
      const iso = addDays('2024-03-20', i)
      const p = calendarParts(iso, true)
      expect(calendarISO(p.year, p.month, p.day, true)).toBe(iso)
    }
  })
  it('uses the actual Persian month boundaries for filtering and navigation', () => {
    persian()
    const month = monthModel('2026-10-13')
    expect(month).toMatchObject({ first: '2026-09-23', next: '2026-10-23', days: 30 })
    expect(month.label).toContain('مهر'); expect(month.label).toContain('۱۴۰۵')
    expect(monthModel('2025-03-20').days).toBe(30)
    expect(monthModel('2026-03-20').days).toBe(29)
    expect(shiftMonth('2026-03-20', 1)).toBe('2026-03-21')
    expect(shiftMonth('2026-03-21', -1)).toBe('2026-02-20')
  })
  it('formats Persian year crossings and switches back to Gregorian without changing data', () => {
    persian()
    expect(fmtDate('2026-10-13', false, true)).toContain('۱۴۰۵')
    const range = fmtDateRange('2026-03-20', '2026-03-21', false, new Date('2026-10-13T12:00:00'))
    expect(range).toContain('۱۴۰۴'); expect(range).toContain('۱۴۰۵')
    expect(calendarInput('2026-10-13')).toBe('1405/07/21')
    _setLangState('en', {}, null, null)
    expect(calendarInput('2026-10-13')).toBe('2026/10/13')
    expect(monthModel('2026-10-13')).toMatchObject({ first: '2026-10-01', next: '2026-11-01', days: 31 })
  })
})
describe('Persian profile and numeric input', () => {
  it('supplies calendar control labels for every selectable language', () => {
    for (const lang of Object.keys(LANGS)) {
      for (const key of ['Month', 'Year', 'Calendar']) {
        expect(CALENDAR_LABELS[baseLang(lang)][key].trim()).not.toBe('')
      }
    }
  })
  it('keeps scientific terms, user names and account identities intact', () => {
    persian()
    expect(dateLocale()).toBe('fa-IR-u-ca-persian')
    expect(RTL_LANGS.has('fa')).toBe(true)
    expect(matchLocale('fa-IR')).toBe('fa')
    expect(t('Hi {0}', 'openGym')).toBe('سلام openGym')
    expect(t('RIR')).toBe('RIR'); expect(t('RPE')).toBe('RPE')
  })
  it('accepts Persian and Arabic keyboards without changing stored numeric precision', () => {
    expect(numericInput('۶۲٫۷۵')).toBe('62.75')
    expect(numericInput('٦٢,٧٥')).toBe('62.75')
    expect(latinDigits('۱۲۳۴')).toBe('1234')
  })
  it('supports a Saturday week while respecting existing chosen week starts', () => {
    persian()
    expect(weekStartOf({ weekStart: 6 })).toBe(6)
    expect(weekOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5])
    expect(weekKey('2026-10-13', 6)).toBe('2026-10-10')
    expect(weekStartOf({ weekStart: 1 })).toBe(1)
    expect(weekStartOf({})).toBe(1)
  })
})
