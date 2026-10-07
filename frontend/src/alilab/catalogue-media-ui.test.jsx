// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import Media, { Thumb } from '../components/Media.jsx'
import { EXIDX } from '../lib/exercises.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../store/useStore.js', () => ({ useStore: fn => fn({ S: { gifSize: 'full' }, update: () => {} }) }))

it('renders catalogue cards without any img source, animation or broken-media panel', () => {
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    act(() => root.render(<><Thumb ex={EXIDX['0025']} /><Media ex={EXIDX['0025']} /></>))
    expect(host.querySelectorAll('img')).toHaveLength(0)
    expect(host.querySelector('.thumb-x')).toBeTruthy()
    expect(host.querySelector('.exmedia')).toBeNull()
  } finally { act(() => root.unmount()) }
})
