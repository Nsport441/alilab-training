// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXDB, EXIDX, imgSrc, gifSrc } from '../lib/exercises.js'
import { planMediaUrls } from '../lib/media-prefetch.js'
import { CATALOGUE_MEDIA } from './catalogue-media-registry.js'

afterEach(() => vi.unstubAllEnvs())
describe('AliLab non-commercial openGym fork media', () => {
  it('preserves every exercise and resolves its unchanged local openGym MP4', () => {
    expect(EXDB).toHaveLength(5632)
    for (const ex of EXDB) {
      expect(EXIDX[ex.id].n).toBe(ex.n)
      expect(EXIDX[ex.id].st).toEqual(ex.st)
      expect(imgSrc(ex)).toBe(CATALOGUE_MEDIA[ex.id]?.images[0].path || `./opengym-media/still/${ex.id}.webp`)
      expect(gifSrc(ex)).toBe(`./opengym-media/clip/${ex.id}.mp4`)
    }
  })
  it('rejects spoofed media fields and stale third-party CDN variables', () => {
    vi.stubEnv('VITE_IMG_BASE', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset/images/')
    vi.stubEnv('VITE_GIF_BASE', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset/videos/')
    expect(imgSrc({ id: 'unregistered', img: 'old.jpg' })).toBeNull()
    expect(gifSrc({ id: 'unregistered', gif: 'old.gif' })).toBeNull()
    expect(imgSrc({ id: '0025', custom: true, img: 'old.jpg' })).toBeNull()
    expect(gifSrc({ id: '0025', custom: true, gif: 'old.gif' })).toBeNull()
  })
  it('only prefetches same-origin licensed media for known built-in exercise IDs', () => {
    const ids = EXDB.map(ex => ({ id: ex.id }))
    const urls = planMediaUrls({ routines: [{ ex: ids }], active: { entries: ids } }, 'https://training.alilab.ir/')
    expect(urls).toHaveLength(200)
    expect(urls.every(url => url.startsWith('https://training.alilab.ir/catalogue-media/') ||
      url.startsWith('https://training.alilab.ir/opengym-media/'))).toBe(true)
  })
})
