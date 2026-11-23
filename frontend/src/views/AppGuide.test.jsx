// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { _setLangState, getLang } from '../lib/i18n-core.js'
import AppGuide, { AppGuideButton } from './AppGuide.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host, root
beforeEach(() => {
  _setLangState('en')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  _setLangState('en')
})

function render(path) {
  act(() => root.render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/home" element={<AppGuideButton />} />
        <Route path="/library" element={<AppGuideButton fromLibrary />} />
        <Route path="/guide" element={<AppGuide />} />
        <Route path="/workout" element={<h1>Workout screen</h1>} />
      </Routes>
    </MemoryRouter>
  ))
}

const main = () => host.querySelector('main')

it('opens the first-workout guide from Home and links to the existing app screens', () => {
  render('/home')
  act(() => host.querySelector('button[aria-label="App guide"]').click())
  expect(main().getAttribute('lang')).toBe('en')
  expect(main().getAttribute('dir')).toBe('ltr')
  expect(main().querySelector('h2').textContent).toBe('Your first workout')
  expect(main().querySelectorAll('ol li')).toHaveLength(3)
  expect([...main().querySelectorAll('.app-guide-card')].map(link => link.getAttribute('href')))
    .toEqual(['/home', '/plan', '/workout', '/library', '/stats', '/history', '/settings'])
  act(() => main().querySelector('a[href="/workout"]').click())
  expect(host.querySelector('h1').textContent).toBe('Workout screen')
})

it('starts with the app language and switches only the guide language and direction', () => {
  _setLangState('fa')
  render('/guide')
  expect(main().getAttribute('dir')).toBe('rtl')
  expect(main().querySelector('h1').textContent).toBe('راهنمای برنامه')
  act(() => host.querySelector('button[lang="en"]').click())
  expect(main().getAttribute('dir')).toBe('ltr')
  expect(main().querySelector('h1').textContent).toBe('App guide')
  expect(getLang()).toBe('fa')
  act(() => host.querySelector('button[lang="fa"]').click())
  expect(main().getAttribute('lang')).toBe('fa')
  expect(host.querySelector('button[lang="fa"]').getAttribute('aria-pressed')).toBe('true')
})

it('puts library help first and offers a way back to Exercises', () => {
  render('/library')
  act(() => host.querySelector('button[aria-label="App guide"]').click())
  expect(main().querySelector('h2').textContent).toBe('Exercises')
  expect(main().querySelector('section').textContent).toContain('Show all equipment')
  expect(main().querySelector('#app-guide-start').textContent).toBe('Your first workout')
  expect(main().querySelectorAll('.app-guide-card')).toHaveLength(6)
  act(() => main().querySelector('.app-guide-back').click())
  expect(host.querySelector('button[aria-label="App guide"]')).not.toBeNull()
})
