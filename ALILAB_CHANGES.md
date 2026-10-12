# AliLab Training — Phase 1A and Phase 1B branding

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

Phase 1B branding changes (2026-10-11):

- Display AliLab Training in the login, home, settings, printed plans and PWA metadata.
- Reuse existing locale keys, branding the translated template before inserting user values.
- Preserve account/workout IDs, storage keys, legacy backup paths, and upstream attribution.
- Point self-hosting links to the AliLab fork. Hide upstream APK download/update promotion;
  this pilot distributes the web/PWA build and has no AliLab native release yet.
- Identify the build as `1.3.9+alilab.1b.branding`; source archive metadata carries the same phase.

Persian/Jalali support, the visual theme and icon remain subsequent Phase 1B work.
Native releases, MCP deployment,
AI, database migrations and an approved public media catalogue are outside this phase.
The legacy `kubernetes/` manifests and upstream hosting guides are historical references;
use `docs/ALILAB_PHASE1A_FA.md` for this fork's staging configuration.
