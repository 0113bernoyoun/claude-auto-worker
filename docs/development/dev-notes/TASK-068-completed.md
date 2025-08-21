### TASK-068: Local setup/verify tooling

- Date: 2025-08-21
- PR: #30

#### What
- Add local setup script and verification flow.

#### Changes
- tools/setup-local.sh: Node/Git check, build, CLI build, port pre-check warning.
- tools/check-local.mjs: build → unit tests → healthcheck → CLI dry-run; install fallback guidance.

#### How verified
- `npm run setup:local` and `npm run verify:local` both succeeded locally.

