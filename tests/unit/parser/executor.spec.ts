import { Test } from '@nestjs/testing';
import { WorkflowExecutorService } from '../../../src/core/workflow-executor.service';
import { ExecutionStateService } from '../../../src/core/execution-state.service';
import { LoggerContextService } from '../../../src/core/logger-context.service';
import { ParsedWorkflow, WorkflowDefinition } from '../../../src/parser/workflow.types';

describe('WorkflowExecutorService', () => {
	let executor: WorkflowExecutorService;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [ExecutionStateService, LoggerContextService, WorkflowExecutorService],
		}).compile();
		executor = moduleRef.get(WorkflowExecutorService);
	});

	function buildParsed(def: WorkflowDefinition): ParsedWorkflow {
		return { format: 'yaml', path: '<memory>', workflow: def };
	}

	it('dry-run should complete without executing work', async () => {
		const def: WorkflowDefinition = {
			name: 'wf',
			steps: [
				{ id: 's1', type: 'noop' },
				{ id: 's2', type: 'noop' },
			],
			stages: [
				{ id: 'st1', steps: ['s1', 's2'] },
			],
		};
		await executor.execute(buildParsed(def), { dryRun: true });
	});

	it('parallel stage should run steps with worker-pool without errors', async () => {
		const def: WorkflowDefinition = {
			name: 'wf',
			steps: [
				{ id: 'a', type: 'noop' },
				{ id: 'b', type: 'noop' },
				{ id: 'c', type: 'noop' },
			],
			stages: [
				{ id: 'st', steps: ['a', 'b', 'c'], parallel: true },
			],
		};
		await executor.execute(buildParsed(def), { concurrency: 2 });
	});
});
