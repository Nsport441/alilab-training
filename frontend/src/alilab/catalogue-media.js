// AliLab Phase 1A deliberately ships no public exercise media. Generated upstream filenames
// are metadata, not permission to use the underlying assets. Keep this gate independent of
// VITE_* settings so a stale mobile/demo build command cannot re-enable the old CDN.
// A later reviewed media registry will replace this gate without changing exercise IDs.
export const CATALOGUE_MEDIA_POLICY = 'text-only'
export const catalogueMediaSrc = () => null
