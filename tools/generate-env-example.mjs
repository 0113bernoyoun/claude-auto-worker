#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Use cwd as project root to avoid path resolution issues when invoked via npm scripts
const PROJECT_ROOT = process.cwd();
const TARGET = path.join(PROJECT_ROOT, '.env.example');

const force = process.argv.includes('--force');

const content = `# Local development defaults\nNODE_ENV=development\nPORT=5849\nLOG_LEVEL=info\n\n# Claude API (optional for local smoke)\nCLAUDE_API_KEY=\nCLAUDE_MODEL=claude-3-5-sonnet-latest\n\n# GitHub integration\nUSE_GITHUB=true\nGITHUB_MODE=auto # auto|cli|token|manual\nGITHUB_TOKEN=\nGITHUB_API_BASE=\n\n# Logging (optional)\nLOG_CONFIG_DIR=\n`;

if (fs.existsSync(TARGET) && !force) {
  console.log(`⚠️  ${path.relative(PROJECT_ROOT, TARGET)} already exists. Use --force to overwrite.`);
  process.exit(0);
}

fs.writeFileSync(TARGET, content, 'utf8');
console.log(`✅ Wrote ${path.relative(PROJECT_ROOT, TARGET)}`);


