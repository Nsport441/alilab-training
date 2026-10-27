// Built-in openGym 180px media retained only under openGym's published non-commercial
// fork exception. Original assets and upstream media NOTICE are bundled unchanged.
// Ownership: Gym visual. Not AGPL; remove or separately license before commercial use.
// Never pass these media files to an AI model.
import { EXDB } from '../lib/exercises-data.js'
import { CATALOGUE_MEDIA } from './catalogue-media-registry.js'

export const CATALOGUE_MEDIA_POLICY = 'opengym-noncommercial-fork-180px'
const BUILTIN_IDS = new Set(EXDB.map(ex => ex.id))
const localId = ex => ex && !ex.custom && BUILTIN_IDS.has(ex.id) && /^\d{4}$/.test(ex.id) ? ex.id : null
export const catalogueMediaFor = ex => localId(ex) ? CATALOGUE_MEDIA[ex.id] || null : null
export const catalogueMediaSources = ex => {
  const id = localId(ex)
  if (!id) return []
  return catalogueMediaFor(ex)?.images.map(image => image.path) || [`./opengym-media/still/${id}.webp`]
}
export const catalogueMediaSrc = (ex, kind) => {
  const id = localId(ex)
  if (!id) return null
  if (kind === 'img') return catalogueMediaSources(ex)[0] || null
  if (kind === 'gif') return `./opengym-media/clip/${id}.mp4`
  return null
}
