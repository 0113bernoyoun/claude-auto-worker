Summary
- Integrate nest-commander and add CLI commands: run, status, logs, help
- Add CLI bootstrap (src/cli/main.ts) and tsconfig.cli.json
- Update error handling to avoid false error on help/version (no hang)
- Update .cursorrules to explicitly state: docs/state updates occur ONLY on PR merge, not on task completion
- Update DEVELOPMENT_TASKS checklist for TASK-008 and TASK-009 (structure ready)

Changes
- src/cli/**/*
- tsconfig.cli.json
- .cursorrules
- DEVELOPMENT_TASKS.md

Test
- ./dist/cli.js --help shows commands without error
- run/status/logs help and sample invocations verified

Notes
- Addresses hang-like behavior after help by skipping commander helpDisplayed/version/outputHelp codes.
- Removes non-ASCII dev-notes from PR. dev-notes will be generated after merge per rules.

Closes: TASK-008
