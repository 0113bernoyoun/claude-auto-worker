### 🧾 Overall
**Ready to merge.** Changes are isolated to parser/CLI validation path with full test coverage and green builds.

### 🌟 Highlights
- **Clear schema boundary**: Minimal JSON Schema captures MVP fields (`name`, `steps[]`, required `id`/`type`).
- **Custom safety net**: `uniqueStepIds` keyword prevents subtle execution bugs later in executor.
- **Good DX**: Consolidated error messages with file context; early failure during `parseFromFile`.
- **Non-invasive integration**: Validator injected via `ParserModule`; existing shape checks preserved.

### 🧩 Issues & Severity
- **Major**: None identified.
- **Minor**:
  - Consider caching the compiled validator instance to avoid re-compilation per parse in long sessions. (Low overhead now, but trivial to cache)
- **Nit**:
  - Future: export `WorkflowJsonSchema` in index if external tools need to consume schema.

### 📝 Action items
- [ ] (Optional) Cache Ajv `compile` result inside `WorkflowValidatorService` to reuse across validations.
- [ ] (Optional) Add a negative-path CLI e2e test once real filesystem parsing is enabled outside mocks.

### ✅ Verification
- CLI tests: 8/8 passed
- Core tests: 6/6 passed
- Lint: clean
- Smoke: example YAMLs valid; synthetic duplicate-ids file fails as expected

### 🎯 Mergeability
- Scope is small; impact is limited to parser validation. Safe to merge.

### 🔗 Context
- Implements `TASK-015` (Workflow schema validation system) per `DEVELOPMENT_TASKS.md`
- Aligns with PRD/TRD reliability & safety requirements
