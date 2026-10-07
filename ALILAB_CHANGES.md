# AliLab Training — Phase 1A

Modified fork of openGym; baseline is pinned in `UPSTREAM.json`. Modification date: 2026-10-07.
Code remains AGPL-3.0-or-later. Original copyright and third-party notices remain in LICENSE
and NOTICE.md. No public exercise image or animation licence is claimed by this fork.

- Disable public catalogue media centrally, including stale VITE_IMG_BASE/VITE_GIF_BASE overrides.
- Remove the downloader, media mounts and mobile/demo CDN build paths; old media URLs return 404.
- Purge legacy exercise media from service-worker caches without clearing user workout storage.
- Retain all exercise IDs, instructions, workout logging, routine/history and sync contracts.
- Patch undici and the Capacitor 7 core/CLI/Android/iOS packages; lockfile updates included.
- Use source-built web/API images, one persistent API data volume and an AI-disabled pilot.
- Serve corresponding source with the web image; do not point the fork's source link only upstream.
- Replace inherited publication/mirroring automation with test-only Node 22 CI.

Phase 1B will add AliLab branding and Persian/Jalali support. Native releases, MCP deployment,
AI, database migrations and an approved public media catalogue are outside this phase.
The legacy `kubernetes/` manifests and upstream hosting guides are historical references;
use `docs/ALILAB_PHASE1A_FA.md` for this fork's staging configuration.
