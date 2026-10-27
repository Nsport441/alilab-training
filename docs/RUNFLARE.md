# Runflare: two explicit build contexts, no automatic deployment

Baseline investigated: `e6f26efd7457513b0e6e4e3ffd584af57e05ea4e` (main).
Reported state: API v3 running; v4/v5 failed with `Dockerfile does not exist`.
These production facts came from the operator; no production access or changes were made.

## Diagnosis and platform limits

There is no root Dockerfile. API uses `api/Dockerfile` with context `api` and
the final `default` target. Web uses `web/Dockerfile` with repository-root context:
its COPY instructions need both `frontend/` and `api/coach/core/`.
`docker-compose.yml` describes these independent builds, but a Git source builder
does not necessarily run Compose. The reported error is consistent with a builder
looking for a root Dockerfile, before application startup or OAuth becomes relevant.
It is not evidence of a database or application runtime failure.

Official documentation checked 2026-10-27:

- https://docs.runflare.com/docker/deploy-github/ documents OAuth repository/branch,
  manual Revert (which **deploys**), deployment history, and Auto Pull.
- https://docs.runflare.com/docker/deploy-drag-and-drop/ documents ZIP upload with
  a Dockerfile and exclusion of local secrets and unnecessary files.

Neither page documents custom Dockerfile/context/target fields, a Compose build,
registry digest input, or a build-only deployment preview. Do not assume those
capabilities or invent UI field names. Confirm them with Runflare support before
using the corresponding route. OAuth is already connected; no new token is needed.

## Route A: Git only if Runflare confirms context selection

Keep Auto Pull OFF on **both** services. Repository: `Nsport441/alilab-training`;
branch after separately approved merge: `main`. Select one reviewed full commit SHA
for both services, never just an unrecorded branch tip.

| Service | Build directory/context | Dockerfile relative to repository | Dockerfile relative to context | Target | Container port |
|---|---|---|---|---|---|
| alilab-training-api | api | api/Dockerfile | Dockerfile | default | existing API PORT (default 3000) |
| alilab-training-web | . | web/Dockerfile | web/Dockerfile | final nginx stage | existing NGINX_PORT (default 80) |

If build args are supported: set `VCS_REF=<full SHA>` for both, `APP_BUILD=<full SHA>`
for Web, `BUILD_DATE=<commit ISO date>` for both. VERSION is a release label, not
proof of source identity. Use full image digest/ID and revision label for that.
If the required path/context fields are absent, this route cannot build this
monorepo correctly; do not repeatedly press Revert or add one ambiguous root
Dockerfile (it cannot select two different services without another selector).

## Route B: verified source ZIPs (documented upload fallback)

Run the new **Runflare build artifacts (no deploy)** workflow on a reviewed ref,
or let its PR run finish. It checks out the PR head, not the synthetic merge SHA.
It exports committed sources only, creates independent root-Dockerfile contexts,
bakes the full commit into Dockerfile defaults, builds those ZIPs and smoke-tests
Web -> API and the corresponding-source archive. No Runflare credential, webhook,
registry publication, deployment, disk or backup operation exists in this workflow.
The existing test.yml remains unchanged and must also pass before release.

For packaging locally (Git, Node 22, Python 3 and tar required; Docker not required):

```sh
node scripts/package-runflare.mjs <full-reviewed-commit-SHA>
```

Download the workflow artifact and extract its outer GitHub artifact ZIP locally.
Check `SHA256SUMS` and `sources.json`. The inner `api-<SHA>.zip` has API files
and Dockerfile at its root; `web-<SHA>.zip` has the repository layout and a generated
root copy of `web/Dockerfile`. No extra enclosing directory is permitted.
Upload only the correct **inner** ZIP to the matching existing Docker service.
**Uploading starts deployment; this is a future operator action requiring separate
authorization. It was not performed as part of this fix.**

The generated files do not modify either canonical Dockerfile. API's new
`.dockerignore` also protects normal local context builds from local dependencies
and secrets; the repository-root ignore file never applied to the API context.

## Traceability, reproducibility and image promotion

Both services must use the same source SHA. Archive with each release:
workflow run URL/attempt, full source SHA, both source ZIP checksums, platform,
`images.jsonl`, `images.tar.gz` checksum, Runflare service/version and deployed image
digest when available. `images.jsonl` contains local Docker image IDs (config SHA),
**not registry manifest digests**. CI saves the actual tested pair of images using
`docker save`; retain these artifacts externally before the 14-day CI expiry.

Source rebuilds are repeatable procedures, not guaranteed byte-identical images:
base-image tags and `apk upgrade` can change. ZIP rebuilding in Runflare therefore
does not prove it runs the exact tested image. If Runflare confirms registry image
deployment, prefer promoting the saved tested images to an approved registry:
load `images.tar.gz`, inspect IDs/revision labels, tag each image with full source
SHA, push, record the resulting **registry manifest digest**, then configure each
service using `registry/path@sha256:<digest>` if supported. Registry push and
Runflare image selection are not automated here. Never substitute `latest`,
`edge`, or a Runflare version number for a digest. A SHA tag can still be overwritten.

## Runtime checks to review without changing settings

Do not copy the Compose environment or volume configuration over production.
Review the existing API PORT, DATA_DIR and persistent mount (normally `/data`),
public ORIGIN/RP_ID and session settings against the running v3 configuration.
Keep API private. The Web proxy needs BACKEND equal to the actual private API DNS
hostname (no scheme/path), PORT equal to its port, and RESOLVER equal to the
platform's reachable DNS IP. Compose's `api` and `127.0.0.11` are local Docker
defaults, not confirmed Runflare values. Obtain exact private DNS/resolver values
from the existing configuration or Runflare; do not guess `10.96.0.10` or change
environment variables as part of this PR. Web's exposed port must match NGINX_PORT.

After a separately authorized release, verify API `/api/health`, Web `/`, Web
`/api/health` (proxy, not just static health), source archive commit, login and data
sync. Record the image identity from deployment history/runtime inspection where
available. API-first then Web is appropriate only after confirming compatibility;
two services are not an atomic rollout. CI uses disposable containers and data only.

## Risks and rollback boundaries

- Correcting Dockerfile lookup may reveal later build/network/DNS/port errors.
- Web health alone does not test API connectivity; wrong RESOLVER causes timeouts.
- A source ZIP causes a new platform build; exact image equivalence needs digest
  promotion support and registry access/architecture verification.
- Returning to an older image does not restore or reverse persisted data/schema.
  Keep the running API v3 and its known image identity recorded; don't infer its
  source SHA from the version number. Do not execute rollback until data-format
  compatibility and an approved recovery plan are established.
- This PR makes no production deployment, environment, database, disk, backup,
  OAuth or Auto Pull change and must not be merged automatically.
