Code review (TASK-008)

1) Boolean option parsing (nest-commander)
- Flags like --dry-run/--debug/--all/--follow should be true when provided without value.
- Current parsers use `val === 'true'`. Fix by treating undefined as true or remove custom parsers for pure booleans.
  Examples:
  - run.command.ts: parseDryRun(val) => `val === undefined || val === 'true'`
  - run.command.ts: parseDebug(val)  => `val === undefined || val === 'true'`
  - status.command.ts: parseAll(val) => `val === undefined || val === 'true'`
  - logs.command.ts: parseFollow(val) => `val === undefined || val === 'true'`

2) CLI bin packaging
- Add tracked script: `bin/claude-auto-worker` (ASCII name) with shebang and `require('../dist/cli/main.js')`.
- Update package.json `bin` to that path to avoid relying on dist launcher.

3) Help/version exit handling
- Good change. Also consider unknown command exit with friendly message + non-zero code.

4) tsconfig.cli.json
- Looks good.

5) Docs policy
- .cursorrules updated. Removed non-ASCII dev-notes from PR. Generate dev-notes after merge.

6) UX follow-ups
- Consider `--timeout <sec>`, `--no-interactive`, SIGINT handling, and `--format` choices + JSON output for dashboard.
