import { useState } from 'react'
import { imgSrc, gifSrc } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import CustomMedia, { CustomThumb } from './CustomMedia.jsx'
import { catalogueMediaFor, catalogueMediaSources } from '../alilab/catalogue-media.js'
import { alilabText } from '../alilab/copy.js'

// An exercise's picture, wherever one shows. A custom exercise goes to CustomMedia.jsx — its own
// photo, GIF, video or link, from the local media store — and never through imgSrc/gifSrc, which
// name files of the shipped dataset (a stray img/gif on a custom exercise, written by a fork, is
// ignored). The split is by component, not by branch, so each side keeps its own hooks in order.
export default function Media(p) {
  return p.ex?.custom ? <CustomMedia {...p} /> : <BuiltinMedia key={p.ex?.id} {...p} />
}

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12). Settings can also turn workout media off entirely
// (gifSize 'off') — then nothing renders here and the exercise card closes up, exactly like
// an exercise without media. Any other/legacy value behaves as 'full'.
function BuiltinMedia({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const [frame, setFrame] = useState(0)
  // 'gif' → the animation failed, the still is showing; 'all' → the still failed too. Media is
  // fetched from wherever the build points (a mount, a CDN): a dropped connection, an expired
  // session on a gated instance or a CDN hiccup used to leave the browser's broken-image glyph
  // on a white block. Now the still stands in for the animation, a neutral tile stands in for
  // both, and a tap tries again — no text, so nothing new to translate.
  const [failed, setFailed] = useState(null)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  const animation = gifSrc(ex)
  const still = imgSrc(ex)
  const registered = catalogueMediaFor(ex)
  const frames = catalogueMediaSources(ex)
  if (!animation && !still) return null
  if (minimizable && gifSize === 'off') return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }
  const showGif = !!animation && playing && failed == null
  const onError = () => setFailed(showGif && still ? 'gif' : 'all')
  const onTap = () => {
    if (failed) { setFailed(null); setPlaying(true); return }
    if (!animation && frames.length > 1) setFrame(n => (n + 1) % frames.length)
    else setPlaying(p => !p)
  }
  return (
    <figure className="catalogue-figure">
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '') + (failed === 'all' ? ' broken' : '')} id={id} onClick={onTap}>
      {failed === 'all'
        ? <div className="exmedia-x"><Icon name="dumbbell" /></div>
        : showGif && /\.mp4(?:$|[?#])/i.test(animation)
          ? <video src={animation} autoPlay muted playsInline loop preload="metadata" poster={still || undefined} aria-label={exerciseNameFor(ex)} onError={onError} />
          : <img decoding="async" draggable={false} src={showGif ? animation : (frames[frame % frames.length] || still || animation)} alt={exerciseNameFor(ex)} onError={onError} />}
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && !failed && animation && still && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
    {frames.length > 1 && !mini && !failed && !showGif && <button type="button" className="catalogue-next" onClick={() => setFrame(n => (n + 1) % frames.length)}>{alilabText('Next image')} · {frame % frames.length + 1}/{frames.length}</button>}
    {(registered || animation) && <figcaption className="catalogue-credit">
      {registered && <><a href={registered.sourceUrl} target="_blank" rel="noopener noreferrer">{alilabText('Image source')}: {registered.images[0].author} / wger</a> · <a href={registered.images[0].licenseUrl} target="_blank" rel="noopener noreferrer">{registered.images[0].license}</a> · </>}
      {animation && <><a href="https://gymvisual.com/" target="_blank" rel="noopener noreferrer">© Gym visual · openGym animation</a> · <a href="./opengym-media/NOTICE.md" target="_blank" rel="noopener noreferrer">Media licence</a></>}
    </figcaption>}
    </figure>
  )
}

// A still that will not load (offline and never cached, a lapsed session on a gated instance, a
// CDN hiccup) gets the same neutral tile as an exercise without media, instead of the browser's
// broken-image glyph in a list of them (#281). The failure is remembered per image, so a list
// that re-renders does not ask again; a new exercise in the same slot tries its own.
export function Thumb(p) {
  return p.ex?.custom ? <CustomThumb {...p} /> : <BuiltinThumb {...p} />
}
function BuiltinThumb({ ex }) {
  const src = imgSrc(ex)
  const [broken, setBroken] = useState(null)
  if (!src || broken === src) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return <img className="thumb" loading="lazy" decoding="async" draggable={false} src={src} alt="" onError={() => setBroken(src)} />
}
