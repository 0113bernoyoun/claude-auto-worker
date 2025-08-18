#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(CliModule);
	await CommandFactory.run(CliModule, {
		logger: ['error', 'warn'],
		errorHandler: (err: any) => {
			const code = err?.code || err?.name || '';
			// Commander가 help/version 출력 시 사용하는 코드들은 오류가 아님
			if (
				code === 'commander.helpDisplayed' ||
				code === 'commander.version' ||
				code === 'outputHelp'
			) {
				process.exit(0);
			}
			console.error('❌ CLI Error:', err?.message || err);
			process.exit(err?.exitCode ?? 1);
		},
	});
	await app.close();
}

bootstrap().catch((err) => {
	console.error('❌ Bootstrap Error:', err);
	process.exit(1);
});
