### ✨ What (Summary)
- **Implement TASK-016 DSL parsing engine with comprehensive stages, prompt, and run support**
- **Add WorkflowParserService** with DSL parsing capabilities for YAML/JSON workflows
- **Implement template engine** with Handlebars-style syntax support (`{{#if}}`, `{{#each}}`, `${variables}`)
- **Add command parser** for run command validation and execution
- **Add Git policy service** for branch naming and policy validation
- **Include comprehensive test coverage** for all new components (49/49 tests passing)
- **Add DSL test workflow example** for validation and demonstration

### 🧭 Why (Background)
- **Implements TASK-016** from `DEVELOPMENT_TASKS.md`: DSL syntax parsing engine development
- **Enables workflow definition** using YAML/JSON with stages, prompts, and run commands
- **Provides foundation** for TASK-020 (Workflow Executor) and subsequent workflow execution features
- **Aligns with PRD/TRD goals** for safe automation and workflow DSL support

### 🛠️ Changes
- **`src/parser/workflow.parser.service.ts`**: Core DSL parsing engine with stages, steps, and validation
- **`src/parser/template.engine.service.ts`**: Handlebars-style template processing with conditional logic
- **`src/parser/command.parser.service.ts`**: Run command parsing and validation
- **`src/parser/git.policy.service.ts`**: Git branch naming and policy validation
- **`src/parser/workflow.types.ts`**: Enhanced type definitions for workflow components
- **`src/parser/workflow.schema.ts`**: JSON schema validation rules
- **`docs/examples/basic/dsl-test.yaml`**: Comprehensive DSL workflow example
- **`tests/unit/parser/`**: Full test coverage for all new services

### 🖼️ Screenshots/Logs/CLI Output
```bash
🚀 Running workflow: docs/examples/basic/dsl-test.yaml
Debug mode: enabled
Output directory: default
📄 Parsed workflow: DSL 파싱 테스트 워크플로우 (yaml)
🧩 Steps: 7
📝 Processing workflow steps...
🔧 Executing Claude API calls...
💾 Saving results...
✅ Workflow execution completed successfully
```

### ✅ How verified (Tests)
- **CLI Tests**: 8/8 suites passed, 49/49 tests passed ✅
- **Core Tests**: 6/6 suites passed, 36/36 tests passed ✅
- **Manual Testing**: DSL workflow parsing with complex templates ✅
- **Template Validation**: Handlebars syntax validation working ✅
- **Command Parsing**: Run command parsing and validation ✅

### 🎯 Impact/Risk
- **Low risk**: Parser-only implementation, no runtime execution changes
- **High value**: Foundation for workflow execution engine
- **Backward compatible**: Existing CLI functionality preserved
- **Performance**: Efficient parsing with early validation

### 🚀 Rollout/Rollback
- **Rollout**: Merge and release; parser ready for workflow execution
- **Rollback**: Revert this PR; falls back to basic file parsing
- **No migration required**: New functionality is additive

### ☑️ Checklist
- [x] Build/Tests green (49/49 tests passing)
- [x] Lint passes
- [x] Port remains 5849 in configs
- [x] No secrets or sensitive data
- [x] Comprehensive test coverage
- [x] DSL workflow example included
- [x] Template engine validation working

### 🔗 References
- **TASK-016**: DSL 문법 파싱 엔진 개발 → stages/prompt/run 최소 파싱 지원
- **PRD**: 워크플로우 정의 (DSL) 요구사항
- **TRD**: DSL Parser 컴포넌트 설계
- **Next**: TASK-020 (Workflow Executor 핵심 구조 설계)
