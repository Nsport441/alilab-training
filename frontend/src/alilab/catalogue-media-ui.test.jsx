// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import Media, { Thumb } from '../components/Media.jsx'
import { EXIDX } from '../lib/exercises.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../store/useStore.js', () => ({ useStore: fn => fn({ S: { gifSize: 'full' }, update: () => {} }) }))

it('renders local openGym MP4 and thumbnail for every built-in exercise', () => {
  const host = document.createElement('div')
  const root = createRoot(host)
  try {
    act(() => root.render(<><Thumb ex={EXIDX['0032']} /><Media ex={EXIDX['0032']} /></>))
    expect(host.querySelector('img.thumb').getAttribute('src')).toBe('./opengym-media/still/0032.webp')
    const video = host.querySelector('.exmedia video')
    expect(video.getAttribute('src')).toBe('./opengym-media/clip/0032.mp4')
    expect(video.hasAttribute('muted')).toBe(true)
    expect(video.hasAttribute('loop')).toBe(true)
    expect(host.querySelector('figcaption').textContent).toContain('Gym visual')
    act(() => host.querySelector('.exmedia').click())
    expect(host.querySelector('.exmedia video')).toBeNull()
    expect(host.querySelector('.exmedia img').getAttribute('src')).toBe('./opengym-media/still/0032.webp')
  } finally { act(() => root.unmount()) }
})
it('preserves wger/Everkinetic stills and their separate attribution', () => {
  const host = document.createElement('div'), root = createRoot(host)
  try {
    act(() => root.render(<Media ex={EXIDX['0025']} />))
    expect(host.querySelector('video').getAttribute('src')).toBe('./opengym-media/clip/0025.mp4')
    expect(host.querySelector('figcaption').textContent).toContain('CC BY-SA 3.0')
    act(() => host.querySelector('.exmedia').click())
    expect(host.querySelector('img').getAttribute('src')).toBe('./catalogue-media/wger-68.png')
    act(() => host.querySelector('.catalogue-next').click())
    expect(host.querySelector('img').getAttribute('src')).toBe('./catalogue-media/wger-70.png')
  } finally { act(() => root.unmount()) }
})
