# Persian translation batch 06

This batch adds Persian display names and complete instructions for exactly 500
independent exercises (2,634 instruction steps). It adds no exercises or media.
The original English data, stable IDs, saved plans, media paths and service-worker
configuration are unchanged. Persian and English search use the existing overlay.

The assistant translated the pinned English text and compared the steps. Exact
shared English sentences reuse a single translation; names were translated in
exercise context. Automatic Google Translate drafts were not accepted as reviewed
translations. Independent review by an exercise professional remains pending.
This is a translation of the source, not an endorsement of an exercise technique.

Selection prioritizes shorter, complete source guides. Ambiguous entries are
deferred: 0784, 11784, 1562, 1603, 0843 and 4176. The latter two were replaced in
this batch so that it still contains exactly 500 entries. Selection is not based
on measured user activity or claimed popularity.

`persian-batch-06-review.json` records the source and translation SHA-256 for each
exercise and the previously localized IDs. Hashes use UTF-8 JSON with keys in
`name`, `instructions` order and no whitespace. The tests bind those records to
the original runtime catalogue and verify search and language switching for all
500 entries. Existing tests verify numeric values, step counts, fallback and
saved-plan compatibility. These checks do not establish expert approval.

Previously, 168 of the 4,308 newly imported exercises had Persian overlays. This
batch raises that number to 668, leaving 3,640 (including deferred entries).
It retains the existing repository license and media notices. No media is added,
re-encoded, prefetched or cached by this change.

The source overlay grows from 107,001 to 347,278 UTF-8 bytes. Compressing the
source JSON with gzip grows from 12,997 to 42,856 bytes (29,859 extra bytes).
These are source-overlay measurements, not measured page-load timings or final
bundle sizes. The production build and Runflare smoke tests remain release gates.
