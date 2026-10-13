// @vitest-environment happy-dom
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'
import DateField, { DatePicker } from './DateField.jsx'
import { NumberField } from './ui.jsx'
import { _setLangState } from '../lib/i18n-core.js'
import fa from '../locales/fa.js'

let host, root, stored
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  _setLangState('fa', fa, null, null)
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host); stored = null
})
afterEach(() => { act(() => root.unmount()); host.remove(); _setLangState('en', {}, null, null) })
const type = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
function Field() {
  const [value, setValue] = useState('2026-10-13')
  stored = value
  return <DateField value={value} onChange={setValue} max="2026-10-13" />
}
it('never leaves the previous valid date saveable behind an invalid draft', () => {
  act(() => root.render(<Field />))
  const input = host.querySelector('input')
  expect(input.value).toBe('1405/07/21')
  type(input, '۱۴۰۵/۰۷/۳۱')
  expect(stored).toBe(''); expect(input.getAttribute('aria-invalid')).toBe('true')
  type(input, '۱۴۰۵/۰۷/۲۰')
  expect(stored).toBe('2026-10-12')
  type(input, '1405/07/22')
  expect(stored).toBe('')
})
it('selects the same ISO day from the Persian calendar and disables future days', () => {
  act(() => root.render(<DatePicker value="2026-10-13" max="2026-10-13" onPick={v => { stored = v }} close={() => {}} />))
  const day = host.querySelector('[aria-label="1405/07/20"]')
  expect(day).toBeTruthy()
  act(() => day.click()); expect(stored).toBe('2026-10-12')
  expect(host.querySelector('[aria-label="1405/07/22"]').disabled).toBe(true)
})
it('logs Persian decimal keyboard input as a number rather than deleting its digits', () => {
  function Weight() { const [n, setN] = useState(60); stored = n; return <NumberField value={n} onChange={setN} /> }
  act(() => root.render(<Weight />))
  type(host.querySelector('input'), '۶۲٫۷۵')
  expect(stored).toBe(62.75)
})
