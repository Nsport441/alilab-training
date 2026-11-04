# Persian translation batch 07 (draft)

This draft adds names and full Persian guides for 400 independent imported
exercises (2,079 steps), based on the pinned upstream English text. It would
raise localization coverage from 668 to 1,068 of 4,308 imported exercises.
No catalogue IDs, English instructions, saved plans, media, or service worker
configuration are modified. Existing licences and media notices remain in place.

Selection prioritizes guides with instructions that can reuse earlier
translations and defers ambiguous source records for a later batch.

The assistant compared all 400 names with their source. Of the instruction
steps, 942 reuse an existing translation with matching English
after normalizing case, whitespace and the final full stop. Another
199 use a source-compared correction from this batch.
The remaining 938 steps use existing machine translation drafts,
with terminology and automated consistency checks. The one-based indexes of
these steps are listed as `draft_steps` per record in the review manifest.
They require step-by-step source comparison before release. Independent review
by an exercise specialist is pending.

The manifest binds every translation to its original name and step text with
SHA-256 hashes of compact UTF-8 JSON. Tests also verify instruction counts,
numeric values, bilingual lookup, English fallback and previous batch integrity.

The Persian overlay grows by 248,806 bytes as source JSON and
31,473 bytes when gzip-compressed. These are source file measurements.
