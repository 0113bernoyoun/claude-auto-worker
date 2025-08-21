### TASK-067: .env.example and config fallbacks (no-Docker)

- Date: 2025-08-21
- PR: #30

#### What
- Provide `.env.example` with PORT=5849, NODE_ENV=development and GitHub options.
- Confirm services use safe defaults when env not set.

#### Changes
- tools/generate-env-example.mjs: generates `.env.example` (idempotent).
- package.json: `env:example` script.

#### How verified
- `npm run env:example` writes `.env.example`.

