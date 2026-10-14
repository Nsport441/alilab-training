// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXDB, EXIDX, imgSrc, gifSrc } from '../lib/exercises.js'
import { planMediaUrls } from '../lib/media-prefetch.js'
import { CATALOGUE_MEDIA } from './catalogue-media-registry.js'

afterEach(() => vi.unstubAllEnvs())

describe('AliLab public media boundary', () => {
  it('keeps every exercise and its instructions usable without resolving upstream media', () => {
    expect(EXDB).toHaveLength(1324)
    for (const ex of EXDB) {
      expect(EXIDX[ex.id].n).toBe(ex.n)
      expect(EXIDX[ex.id].st).toEqual(ex.st)
      expect(imgSrc(ex)).toBe(CATALOGUE_MEDIA[ex.id]?.images[0].path || null)
      expect(gifSrc(ex)).toBeNull()
    }
  })

  it('ignores stale CDN build variables and imported or invented media fields', () => {
    vi.stubEnv('VITE_IMG_BASE', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset/images/')
    vi.stubEnv('VITE_GIF_BASE', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset/videos/')
    const forged = { id: 'unregistered', img: 'old.jpg', gif: 'https://example.com/unapproved.gif' }
    expect(imgSrc(forged)).toBeNull()
    expect(gifSrc(forged)).toBeNull()
  })

  it('prefetches only both registered same-origin stills and rejects custom ID collisions', () => {
    const ids = EXDB.map(ex => ({ id: ex.id }))
    const urls=planMediaUrls({ routines: [{ ex: ids }], active: { entries: ids } }, 'https://training.alilab.ir/')
    expect(urls).toHaveLength(38)
    expect(urls.every(url=>url.startsWith('https://training.alilab.ir/catalogue-media/'))).toBe(true)
    expect(imgSrc({id:'0025',custom:true})).toBeNull()
  })
})
