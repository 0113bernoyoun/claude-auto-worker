### ✨ What (Summary)
- **Add JSON Schema validation for workflows using Ajv**
- Define minimal schema (`name`, `steps[]` with `id`, `type`) and basic fields
- Implement `WorkflowValidatorService` with custom `uniqueStepIds` rule
- Integrate validator into `WorkflowParserService` and export via `ParserModule`
- Add unit tests for validator and CLI integration; all tests passing

### 🧭 Why (Background)
- Implements TASK-015 from `DEVELOPMENT_TASKS.md`: Workflow schema validation system
- Ensures early failure and clear error messages for malformed workflow files, aligning with PRD/TRD reliability goals

### 🛠️ Changes
- `src/parser/workflow.schema.ts`: JSON Schema definition
- `src/parser/workflow.validator.service.ts`: Ajv validator with custom keyword
- `src/parser/parser.module.ts`: Provide/export validator
- `src/parser/workflow.parser.service.ts`: Invoke schema validator after parse
- `tests/unit/cli/workflow.validator.spec.ts`: Unit tests for validator
- `tests/unit/cli/run.command.spec.ts`: Adds a case for duplicate steps (integration surface)
- `package.json`: Add Ajv deps (installed)

### ✅ How verified (Tests)
- Ran `npm run test:cli` → 8/8 suites passed
- Ran `npm test` → core suites passed
- Manual sanity via CLI logs in unit tests

### 🎯 Impact/Risk
- Low runtime overhead during parsing
- Failing fast on invalid workflows; improves DX and robustness

### 🚀 Rollout/Rollback
- Rollout: merge and release; no migration
- Rollback: revert this PR; parser falls back to lightweight shape checks

### ☑️ Checklist
- [x] Build/Tests green
- [x] Lint passes
- [x] Port remains 5849 in configs
- [x] No secrets or sensitive data

### 🔗 References
- TASK-015: 워크플로우 스키마 검증 시스템
- PRD/TRD validation requirements
