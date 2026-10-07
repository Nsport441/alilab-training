# Prepare AliLab Training Phase 1A infrastructure

This fork previously inherited public exercise-media downloads and CDN fallbacks with unresolved rights,
upstream publication automation, and runtime dependency advisories. The pilot now starts from source-built
web/API images with public catalogue media disabled, an invite-only account flow, one persistent API data
volume, and AI/uploads disabled. All 1,324 exercise IDs and instructions remain available.

The web image offers the corresponding source for its build. Original AGPL and third-party notices remain;
AliLab changes and the exact audited baseline are recorded separately. Offline owner bootstrap and
checksum-checked snapshots support account/state recovery without opening public registration.

Validation under Node 22.23.3: 3,167 frontend tests pass; API 471 pass, 2 skip; 2 operational tests pass,
including real API registration, workout persistence, snapshot/restore, original session and password login.
Frontend build, locale consistency, generated coach assets and plain-Node imports pass. Scoped runtime npm
audits report zero advisories. No claim is made about native binaries, build dependencies or image/OS scans.

Docker/Runflare execution remains unverified in the authoring environment. The container CI job and staging
guide cover boot, private routing, source availability, legacy-media 404s, persistent-volume redeploy and
backup recovery. GitHub fork/PR creation and deployment are not part of the validation already completed.
Persian/Jalali branding, approved media, AI and database migration are later changes.
