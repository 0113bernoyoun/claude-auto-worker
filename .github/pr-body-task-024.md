### ✨ What
- Add unit tests for WorkflowExecutor rollback execution
- Add unit tests for test output capture (PASS/Tests: lines) for `type: "test"` steps
- Ensure no cross-branch side effects; commit isolated to `feature/task-024-test-runner`

### 🧭 Why
- Covers TASK-024 acceptance criteria around test execution and quality assurance hooks
- Verifies rollback sequence logging and basic test output parsing

### 🛠 Changes
- `src/test/unit/executor.spec.ts`: +2 tests (rollback on failure, test output capture)

### ✅ How verified
- `npm test` → 9/9 suites passed locally
- Confirmed failure path triggers rollback and logs

### 🎯 Impact/Risk
- Test-only change; no runtime behavior modified
- Minimal risk, improves coverage

### 🚀 Rollout/Rollback
- Merge to base; no migrations
- Rollback by reverting the PR if needed

### ☑️ Checklist
- [x] Tests added and passing
- [x] Lint clean
- [x] Targets correct base branch

### 🔗 References
- TASK-024 in `docs/project/DEVELOPMENT_TASKS.md`
