# AliLab catalogue import

Pinned upstream: `DuarteSantos8/openGym@b6cfe2bbd3f099523ffbf2677438864e9a09a06f` (checked 2026-10-29).
Base: PR #19, `8338ae24a19ea20c8f0ed4fb890edcb44d21fdc2`.

## Counts and data model

The upstream **data records**, not media filenames, contain 6,554 unique IDs. Of these,
922 records have `variantOf` and represent alternate drawings. The generated EXDB contains
**5,632 independent exercises**, including every one of the 1,324 original IDs and names;
there are **4,308 additions**. Variant aliases resolve on read without rewriting saved IDs.
Six duplicate names already exist upstream; different IDs/muscle metadata are preserved,
not merged by name. The importer rejects duplicate IDs and the tests reject new duplicate
name/body-part/equipment/target/secondary-muscle combinations.

`upstream.json` is a lossless text snapshot of the pinned source exercise JSON files.
`legacy.json` preserves the complete PR #19 catalogue as a compatibility fixture.
`provenance.json` records counts, media sizes and duplicate-name groups.
`media-manifest.json` pins every shipped binary by SHA-256 and byte length.
No network access is needed to regenerate or test the imported data.

The importer transfers English names, descriptions, instructions, target and secondary muscles,
muscle-map weights, equipment, category, hold/needs flags and female/male references.
AliLab's approved muscle overlays remain in place. New entries follow the original catalogue
in stable name order, preserving the familiar first page. Category chips intersect search,
body-part and equipment filters. Explicit auxiliary equipment requirements are respected.
Holds default to timed sets only on fresh addition. Existing explicit modes and pre-mode
cardio classifications remain unchanged, even where upstream taxonomy has changed.
No database migration, state rewrite, ID renumbering, profile deletion or backup deletion occurs.

## Translation status — release limitation

Upstream has **no Persian pack**. Existing 1,324 Persian names and 280 Persian short guides
remain untouched. All 4,308 new entries have complete upstream English instructions and
descriptions, but **reviewed Persian names and guides for them are still missing**.
The interface/category controls remain Persian and RTL; the existing per-exercise English
instruction fallback is explicit. Do not claim full Persian translation coverage or release
this as a finished fully translated upgrade. Existing other-language curated packs likewise
retain their original corpus and per-exercise English fallback. Their regression tests are
scoped to the original curated corpus; expanded-catalogue fallback has its own tests.

## Media licence and budget

See `UPSTREAM-NOTICE.md`, `UPSTREAM-LICENSE`, the root `NOTICE.md` and the unchanged
`frontend/public/opengym-media/NOTICE.md`. The original ExerciseDB text is MIT; newer
community text/muscle corrections are AGPL. Media ownership remains with Gym visual.
Only the published **non-commercial openGym fork exception** permits retaining these
unmodified media with notices. Commercial use needs a separate appropriate licence.
No high-resolution/app-only content, hotlinks, transformations or AI media ingestion is used.

The full upstream media set is 199,160,433 bytes; shipping independent exercise pairs only
uses **173,092,762 bytes / 11,264 files** (about 165 MiB), versus 39,036,893 bytes before.
The increase is 134,055,869 bytes (about 128 MiB). Files are local and demand-loaded;
the library still renders 40 rows at a time. MP4 uses metadata-only preload and the existing
still/neutral fallback. The media cache remains capped at 150 MiB / 3,000 entries.
Do not expect the entire catalogue offline. Installed-PWA prefetch is restricted to plan
media, at most 200 URLs, active session first, concurrency two, respecting offline/data saver/
cellular checks. Excess media remains on demand; browser tabs do not bulk-prefetch.

The initial production build measured the catalogue module at approximately 3.65 MB,
661 kB gzip, separate from the roughly 889 kB / 273 kB gzip app module. Media is not part
of these JavaScript bytes. Real low-end-phone startup, video playback and offline eviction
still require device testing; a header/hash check is not a full decoder/playback test.

## Reproduce and release gates

```
node scripts/build-alilab-catalogue.mjs --check
node scripts/build-coach-assets.mjs --check
node --test scripts/test/catalogue-import.test.mjs
node scripts/check-alilab-boundary.mjs
cd frontend
npm test
npm run build
node scripts/check-locales.mjs
```

The media test checks every byte hash, file existence, WebP/MP4 structure, H.264 sample entry
and nonzero dimensions no larger than 180px. Runtime regressions cover all legacy modes,
variant/custom IDs, new categories, Persian/English fallback, five-digit media IDs and bounded
active-session-first prefetch. Existing history/import/backup/sync/service-worker suites remain.

The PR Runflare workflow must build and smoke-test the exact committed Web and API upload
contexts, verify version identity and HTTP media types, and emit paired candidate manifests.
Local Docker is unavailable in this environment. Keep the PR a **draft** until CI, Runflare
build, reviewed Persian additions and real desktop/mobile/PWA tests have been completed.
There is no automatic merge or deployment. Do not publish Web/API until the exact candidate
commit, successful tests, backups and operator approval have been verified.
