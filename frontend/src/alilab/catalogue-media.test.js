// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXDB, EXIDX, imgSrc, gifSrc } from '../lib/exercises.js'
import { planMediaUrls } from '../lib/media-prefetch.js'

afterEach(() => vi.unstubAllEnvs())

describe('AliLab public media boundary', () => {
  it('keeps every exercise and its instructions usable without resolving upstream media', () => {
    expect(EXDB).toHaveLength(1324)
    for (const ex of EXDB) {
      expect(EXIDX[ex.id].n).toBe(ex.n)
      expect(EXIDX[ex.id].st).toEqual(ex.st)
      expect(imgSrc(ex)).toBeNull()
      expect(gifSrc(ex)).toBeNull()
    }
  })

  it('ignores stale CDN build variables and imported or invented media fields', () => {
    vi.stubEnv('VITE_IMG_BASE', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset/images/')
    vi.stubEnv('VITE_GIF_BASE', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset/videos/')
    const forged = { id: '0025', img: 'old.jpg', gif: 'https://example.com/unapproved.gif' }
    expect(imgSrc(forged)).toBeNull()
    expect(gifSrc(forged)).toBeNull()
  })

  it('makes no public media prefetch requests for a real plan or session', () => {
    const ids = EXDB.slice(0, 50).map(ex => ({ id: ex.id }))
    expect(planMediaUrls({ routines: [{ ex: ids }], active: { entries: ids } }, 'https://training.alilab.ir/')).toEqual([])
  })
})
