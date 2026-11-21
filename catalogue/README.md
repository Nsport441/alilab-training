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
in stable name order. For the original 1,324 entries, raw body-part/equipment/muscle fields
are also kept as the compatibility baseline: upstream's changed corrections are retained
losslessly in the source snapshot, without replacing AliLab's approved historical model.
New exercises receive the full upstream muscle model. New entries follow the original catalogue
in stable name order, preserving the familiar first page. Category chips intersect search,
body-part and equipment filters. Explicit auxiliary equipment requirements are respected.
Holds default to timed sets only on fresh addition. Existing explicit modes and pre-mode
cardio classifications remain unchanged, even where upstream taxonomy has changed.
No database migration, state rewrite, ID renumbering, profile deletion or backup deletion occurs.

## Persian catalogue coverage

All 5,632 exercise records have a Persian name and Persian instructions or competition
rules. The 1,324 legacy records include 280 short guides and 1,044 step-by-step translations
in `frontend/src/instr/fa-legacy.json`. These translations use the English instructions by
catalogue ID. The Persian pack keeps the English instructions available and loads with the
Persian locale.

For 55 of those IDs the Persian guides use corrected English steps from
[openGym e4a68a94](https://github.com/DuarteSantos8/openGym/tree/e4a68a94c42a3c17cbd560d66ce2e46a7048ab99/catalogue/exercises).
Thirteen guides use documented local corrections to resolve setup or movement conflicts.
The corresponding English steps are in `frontend/src/alilab/legacy-english-instructions.json`.
The archived source steps remain in the catalogue.

- `0067` uses the one-hand snatch defined in the [USAWA rulebook](https://usawa.com/wp-content/uploads/2010/05/RULEBOOK-10th-Edition.pdf).
- `0492` uses a feet-supported, hand-landing depth push-up from the [BC Lacrosse coaching manual](https://bclacrosse.com/Coaching%20Clinics/Coaching%20Clinic%20Manuals/Competition%20Introduction%20Box%20Manual%20-%20EN.pdf).
- `0537` distinguishes the rack position, jerk and controlled return using the [StrongFirst jerk guide](https://www.strongfirst.com/go-ballistic-the-jerk-for-barbell-and-kettlebell/).
- `0755`, `0769`, `1433` and `3281` follow the lock and stop setup from the [Life Fitness Smith machine manual](https://kb.cybexintl.com/Assembly_Manuals/Strength/AI_SSM_Signature_Smith_Machine_English.pdf).
- `0776` is a pull through extension and shrug as shown by [Catalyst Athletics](https://www.youtube.com/watch?v=G1QygZ3Kd3w).
- `0299`, `1374` and `1512` follow the movement described in their catalogue records.
- `1701` places both hands together on one medicine ball as demonstrated by [ACE](https://www.acefitness.org/resources/everyone/exercise-library/40/medicine-ball-push-ups/).
- `0045` includes a controlled descent and uses the bench-press spotting setup described in the [NSCA strength and conditioning manual](https://www.nsca.com/contentassets/116c55d64e1343d2b264e05aaf158a91/basics_of_strength_and_conditioning_manual.pdf).

The 4,308 imported records use `frontend/src/alilab/persian-batch-01.json` and the final
review entries documented in [Persian guide reviews](PERSIAN_FINAL_GUIDE_REVIEWS.md).
Other-language packs use their curated corpus with a per-exercise English fallback.

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
The 1,044 legacy guides were drafted with machine assistance and checked for coverage,
step alignment, numerical cues, and selected technique terminology and source conflicts.
An independent review of every translation and device-level desktop, mobile and offline
tests remain separate verification tasks.
There is no automatic merge or deployment. Publish only a candidate with successful CI
and Runflare build, verified version identity and preserved backups.

The first GitHub Runflare build/smoke test passed for `52f62505`. Full CI exposed eight
catalogue compatibility/count/search assertions; these were repaired and all 99 affected
regression tests passed locally. An existing Hono adapter advisory (GHSA-rmxm-3fg6-px4f)
also failed both API/MCP audits. Their lockfiles update only `@hono/node-server` to 2.1.3;
both targeted lockfile audits pass. No audit check is disabled. Final CI must verify the
latest commit again, including the regenerated API catalogue.

The scoped rimraf-to-glob override addresses the subsequently disclosed glob/minimatch
advisories. Frontend CI checks both glob APIs and Android sync along with the full suite.
