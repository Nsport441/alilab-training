// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { addRoutineExercises, menuSheet, startFlow } from '../sheets.jsx'
import { _setLangState } from '../lib/i18n-core.js'
import fa from '../locales/fa.js'
import Workout from './Workout.jsx'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('../sheets.jsx', () => ({ startFlow: vi.fn(), addRoutineExercises: vi.fn(), menuSheet: vi.fn() }))

const empty = { id: 'empty', name: 'New routine', ex: [] }
const ready = { id: 'ready', name: 'Push', ex: [{ id: '0025' }] }
let host, root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  navigate.mockClear()
  startFlow.mockClear()
  addRoutineExercises.mockClear()
  menuSheet.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  _setLangState('en')
})

function mount({ routines, scheduled }) {
  const S = structuredClone(DEF)
  S.active = null
  S.routines = routines
  S.week = { [new Date().getDay()]: scheduled }
  S.dayPlan = {}
  useStore.setState({ S })
  act(() => root.render(<Workout />))
}

const button = label => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label)

it('offers direct exercise selection and a primary freestyle option for an empty routine in Persian', () => {
  _setLangState('fa', fa)
  mount({ routines: [empty], scheduled: ['empty'] })
  expect(host.querySelector('.card').textContent).toContain('هنوز حرکتی ندارید')
  expect(host.querySelector('.card button.primary')).toBeNull()
  act(() => button('افزودن حرکت').click())
  expect(addRoutineExercises).toHaveBeenCalledWith('empty', { fromWorkout: true })
  expect(navigate).not.toHaveBeenCalled()
  expect(startFlow).not.toHaveBeenCalled()
  const freestyle = button('تمرین آزاد؛ حرکت‌ها را حین تمرین انتخاب کنید')
  expect(freestyle.classList.contains('primary')).toBe(true)
  act(() => freestyle.click())
  expect(startFlow).toHaveBeenCalledWith([])
})

it('asks which scheduled routine receives the exercise when several are empty', () => {
  mount({ routines: [empty, { ...empty, id: 'second', name: 'Second' }], scheduled: ['empty', 'second'] })
  act(() => button('Add exercise').click())
  const [{ items }] = menuSheet.mock.calls[0]
  expect(items.map(item => item.label)).toEqual(['New routine', 'Second'])
  expect(addRoutineExercises).not.toHaveBeenCalled()
  act(() => items[1].onClick())
  expect(addRoutineExercises).toHaveBeenCalledExactlyOnceWith('second', { fromWorkout: true })
  expect(navigate).not.toHaveBeenCalled()
  expect(startFlow).not.toHaveBeenCalled()
})

it('starts the combined day if at least one scheduled routine has exercises', () => {
  mount({ routines: [empty, ready], scheduled: ['empty', 'ready'] })
  act(() => button('Start New routine + Push').click())
  expect(startFlow).toHaveBeenCalledWith(['empty', 'ready'])
  expect(navigate).not.toHaveBeenCalled()
})

it('opens the picker for another empty routine on a rest day and starts ready routines', () => {
  _setLangState('fa', fa)
  mount({ routines: [empty, ready], scheduled: [] })
  const [otherEmpty, otherReady] = host.querySelectorAll('.list .item')
  expect(otherEmpty.querySelector('.tag').textContent).toBe('افزودن حرکت')
  act(() => otherEmpty.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })))
  expect(addRoutineExercises).toHaveBeenCalledExactlyOnceWith('empty', { fromWorkout: true })
  expect(navigate).not.toHaveBeenCalled()
  expect(startFlow).not.toHaveBeenCalled()
  act(() => otherReady.click())
  expect(startFlow).toHaveBeenCalledWith(['ready'])
  act(() => useStore.setState(({ S }) => ({ S: { ...S, routines: [{ ...empty, ex: ready.ex }, ready] } })))
  expect(otherEmpty.querySelector('.tag').textContent).toBe('شروع')
  act(() => otherEmpty.click())
  expect(startFlow).toHaveBeenLastCalledWith(['empty'])
})

function openHelp(label = 'Help for this page') {
  const toggle = button(label)
  const panel = document.getElementById(toggle.getAttribute('aria-controls'))
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(panel.hidden).toBe(true)
  act(() => toggle.click())
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(panel.hidden).toBe(false)
  return { toggle, panel }
}

it('offers the existing picker and freestyle from the Persian help for an empty plan', () => {
  _setLangState('fa', fa)
  mount({ routines: [empty], scheduled: ['empty'] })
  const { toggle, panel } = openHelp('راهنمای همین صفحه')
  expect(panel.querySelector('p').textContent).toContain('اولین حرکت را به برنامهٔ امروز اضافه کنید')
  expect(addRoutineExercises).not.toHaveBeenCalled()
  expect(startFlow).not.toHaveBeenCalled()
  act(() => panel.querySelectorAll('button')[0].click())
  expect(addRoutineExercises).toHaveBeenCalledExactlyOnceWith('empty', { fromWorkout: true })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(panel.hidden).toBe(true)
  act(() => toggle.click())
  act(() => button('تمرین آزاد').click())
  expect(startFlow).toHaveBeenCalledExactlyOnceWith([])
})

it('starts the scheduled routine from the English help when it has exercises', () => {
  mount({ routines: [ready], scheduled: ['ready'] })
  const { panel } = openHelp()
  expect(panel.textContent).toContain('Start today’s routine')
  act(() => button('Start').click())
  expect(startFlow).toHaveBeenCalledExactlyOnceWith(['ready'])
})

it('focuses the other routines on a rest day without picking a routine', () => {
  mount({ routines: [empty, ready], scheduled: [] })
  const { panel } = openHelp()
  expect(panel.textContent).toContain('Choose a routine under Other routines')
  act(() => button('Other routines').click())
  expect(document.activeElement).toBe(host.querySelector('h4.sec'))
  expect(panel.hidden).toBe(true)
  expect(addRoutineExercises).not.toHaveBeenCalled()
  expect(startFlow).not.toHaveBeenCalled()
})

it('explains how to make an empty unscheduled routine usable', () => {
  mount({ routines: [empty], scheduled: [] })
  const { panel } = openHelp()
  expect(panel.textContent).toContain('Add the first exercise to a routine under Other routines')
})

it('links to planning from the help when no routines exist', () => {
  mount({ routines: [], scheduled: [] })
  const { panel } = openHelp()
  expect(panel.textContent).toContain('build a routine in Plan')
  act(() => panel.querySelector('button').click())
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/plan')
})
