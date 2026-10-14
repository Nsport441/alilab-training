import { CATALOGUE_MEDIA } from './catalogue-media-registry.js'
// Raw dataset filenames and VITE CDN overrides cannot add assets to this explicit registry.
export const CATALOGUE_MEDIA_POLICY = 'licensed-registry'
export const catalogueMediaFor = ex => ex && !ex.custom ? CATALOGUE_MEDIA[ex.id] || null : null
export const catalogueMediaSources = ex => catalogueMediaFor(ex)?.images.map(image => image.path) || []
export const catalogueMediaSrc = (ex, kind) => kind === 'img' ? catalogueMediaSources(ex)[0] || null : null
