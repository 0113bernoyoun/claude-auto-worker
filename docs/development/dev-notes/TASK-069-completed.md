### TASK-069: Local path verification flow

- Date: 2025-08-21
- PR: #30

#### What
- Provide one-command verification for no-Docker local dev path.

#### Changes
- package.json: `verify:local` script invoking `tools/check-local.mjs`.

#### How verified
- `npm run verify:local` success (build/tests/healthcheck/CLI dry-run).

