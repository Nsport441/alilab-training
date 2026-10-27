# Generated Runflare api deployment branch

Source commit: 3a178b34444aa2a05f868d5f65f3e949bb229c5b
Service: alilab-training-api
Build: docker build . (root Dockerfile; root context).
Auto Pull must remain OFF. This branch does not deploy anything itself.
Do not merge this generated branch into main, or merge main into it.

To regenerate: export the reviewed source commit with scripts/package-runflare.mjs from main; extract only api-<SHA>.zip into a fresh directory. That directory is the new branch root. Preserve this branch's build-only verification workflow, update its expected source SHA, and commit the entire generated tree on top of this branch's existing tip. Do not overlay files: remove obsolete generated files too. Keep the source SHA in deployment-source.json and Dockerfile defaults; do not replace it with the generated commit SHA. Verify CI before manual Revert in Runflare. Record both generated commit and source commit. Never edit generated application files here.
