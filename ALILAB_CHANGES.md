# AliLab Training — fork changes

Modified fork of openGym; baseline is pinned in `UPSTREAM.json`. Modification date: 2026-10-07.
Latest modification: 2026-10-14. Code remains AGPL-3.0-or-later. Original copyright and third-party notices remain in LICENSE
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

Catalogue and observed-training update (2026-10-14):

- Complete Persian UI values; add 1324 display names and 280 short AliLab guides with per-exercise English fallback and original instructions.
- Bundle 38 unchanged CC BY-SA 3.0 Everkinetic/wger stills for 19 explicitly matched IDs, with attribution and checksums. Legacy CDN media remains denied.
- Add AliLab SVG/PWA icon and dark/light surfaces without changing account accent settings.
- Add an observed 28-day training overview using existing work-set and volume contracts.
- Add offline authenticated encrypted backup and restore, not an active off-host backup service.
- Preserve API behavior, storage and sync formats; see docs/ALILAB_CATALOGUE_INSIGHTS_FA.md.
# ۱۴ اکتبر ۲۰۲۶ — وابستگی‌ها و ابزار بک‌آپ

- حذف تولیدکنندهٔ قدیمی آیکون `@capacitor/assets` و اصلاح چهار lockfile با patchهای سازگار.
- audit کامل توسعه/اختیاری، تست MCP و بررسی ریشه به CI اضافه شدند.
- گزینهٔ صریح حذف پوشهٔ خصوصی آرشیو از snapshot برای جلوگیری از ورود کلید و آرشیوهای قبلی اضافه شد.
- جزئیات و محدودیت‌ها: [راهنمای وابستگی و بک‌آپ](docs/ALILAB_DEPENDENCY_BACKUP_FA.md).


## 2026-10-27 — Non-commercial openGym exercise media restoration

- Retain official, unmodified 180px openGym stills and MP4 clips alongside the original upstream media NOTICE in frontend/public/opengym-media/ (source openGym main commit e6a95c28a6e3067bdd9b1188d5f37f448d528bd2; media tree e7650a186afc01b8a623588482466cd968efb088).
- Enable same-origin built-in exercise thumbnails and looping muted MP4 clips, retaining existing Everkinetic/wger still attribution for 19 exercises and independent Gym visual animation attribution.
- Preserve all 1324 existing built-in exercise IDs and workout histories. No CDN or public third-party media downloader is introduced.
- Media ownership is external to the AGPL. The upstream notice only excepts non-commercial openGym forks; before commercialization, remove/replace these files or secure a licence from Gym visual. No AI ingestion, training, generation or prompting from the media.
- This is an unmerged proposed change until tests/build/runtime media behavior and deployment size are validated.
