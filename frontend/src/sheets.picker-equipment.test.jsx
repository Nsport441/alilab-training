// @vitest-environment happy-dom
// Issue #71: choosing a body part after picking an equipment type used to reset the equipment
// filter to "all equipment", even when the new muscle group still had exercises for it. The
// per-body-part chips no longer clear the equipment selection; the eqOn fallback only drops it
// for the current view when the new body part has nothing under that equipment.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { addRoutineExercises, exercisePicker } from './sheets.jsx'
import { EXDB } from './lib/exercises.js'
import { defaultConfig } from './lib/history.js'
import { _setLangState } from './lib/i18n-core.js'
import fa from './locales/fa.js'

const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

// The two chip strips render in order: body parts first, then equipment. Grab a chip by its
// visible label out of the whole picker.
const chipByText = (host, text) =>
  [...host.querySelectorAll('.chips .chip')].find(b => b.textContent.trim() === text)
const isOn = el => el.className.split(/\s+/).includes('on')

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  useStore.setState({ S: structuredClone(DEF), user: null })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
  _setLangState('en')
})

describe('adding exercises to a routine', () => {
  const label = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text)
  const firstExercise = host => host.querySelector('.list .item:has(button.iconbtn)')
  const routines = () => useStore.getState().S.routines

  beforeEach(() => {
    useStore.setState(({ S }) => ({
      S: { ...S, routines: [{ id: 'today', name: 'Today', ex: [] }, { id: 'other', name: 'Other', ex: [] }] },
    }))
  })

  it('adds the picked exercise to the requested routine and offers a return to Start Workout', () => {
    addRoutineExercises('today', { fromWorkout: true })
    const picker = renderTop()
    expect(label(picker, 'Back to start workout')).toBeUndefined()
    act(() => firstExercise(picker).querySelector('button.iconbtn').click())
    expect(routines()[0].ex).toEqual([{ id: EXDB[0].id, ...defaultConfig(EXDB[0].id) }])
    expect(routines()[1].ex).toEqual([])
    expect(useStore.getState().S.active).toBeNull()
    const returnButton = label(picker.querySelector('.picker-search'), 'Back to start workout')
    act(() => returnButton.click())
    expect(useUI.getState().sheets).toEqual([])
  })

  it('shows the Persian return action after saving the exercise settings', () => {
    _setLangState('fa', fa)
    addRoutineExercises('today', { fromWorkout: true })
    const picker = renderTop()
    act(() => firstExercise(picker).click())
    const settings = renderTop()
    expect(routines()[0].ex).toEqual([])
    act(() => label(settings, 'افزودن به برنامه').click())
    expect(routines()[0].ex).toHaveLength(1)
    expect(label(picker, 'بازگشت به شروع تمرین')).toBeTruthy()
  })

  it('keeps the regular routine editor picker available for further additions', () => {
    addRoutineExercises('other')
    const picker = renderTop()
    act(() => firstExercise(picker).querySelector('button.iconbtn').click())
    expect(routines()[0].ex).toEqual([])
    expect(routines()[1].ex).toHaveLength(1)
    expect(label(picker, 'Back to start workout')).toBeUndefined()
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('does not save into another routine if the requested routine was removed', () => {
    addRoutineExercises('today', { fromWorkout: true })
    const picker = renderTop()
    act(() => firstExercise(picker).click())
    const settings = renderTop()
    act(() => useStore.getState().update(s => { s.routines.shift() }))
    act(() => label(settings, 'Add to routine').click())
    expect(routines()).toEqual([expect.objectContaining({ id: 'other', ex: [] })])
    expect(useUI.getState().sheets).toEqual([])
  })
})

describe('exercise picker equipment filter', () => {
  // The exact reproduction from issue #71: "lower arms" + "dumbbell", then switch to "upper arms".
  // Both body parts have dumbbell exercises, so the filter must stay selected across the switch.
  it('keeps the dumbbell filter when switching from lower arms to upper arms', () => {
    exercisePicker(vi.fn())
    const host = renderTop()

    // lower arms → dumbbell
    act(() => chipByText(host, 'lower arms').click())
    const eqChip = chipByText(host, 'dumbbell')
    expect(eqChip, 'dumbbell chip should be offered under lower arms').toBeTruthy()
    act(() => eqChip.click())
    expect(isOn(chipByText(host, 'dumbbell'))).toBe(true)

    // switch to upper arms — dumbbell is still valid there, so it must remain selected
    act(() => chipByText(host, 'upper arms').click())
    expect(isOn(chipByText(host, 'upper arms'))).toBe(true)
    const eqAfter = chipByText(host, 'dumbbell')
    expect(eqAfter, 'dumbbell chip should still be present under upper arms').toBeTruthy()
    expect(isOn(eqAfter)).toBe(true)
    expect(isOn(chipByText(host, 'Any equipment'))).toBe(false)
  })
})
