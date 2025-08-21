#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Use cwd as project root to avoid path resolution issues when invoked via npm scripts
const PROJECT_ROOT = process.cwd();

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd: PROJECT_ROOT, ...opts });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function waitForHttp(port, pathName = '/api/health', timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}${pathName}`);
      if (res.ok) return true;
    } catch {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server not responding on port ${port} within ${timeoutMs}ms`);
}

async function main() {
  console.log('==> 🔎 Local verify: build → test → smoke');

  // Ensure dependencies present (lightweight check)
  if (!fs.existsSync(path.join(PROJECT_ROOT, 'node_modules'))) {
    console.log('==> 📦 Installing deps (npm install)');
    try {
      await run('npm', ['install']);
    } catch (e) {
      console.error('⚠️  npm install failed. Retrying with a clean slate...');
      // Clean slate fallback
      try {
        await run('rm', ['-rf', 'node_modules', 'package-lock.json']);
      } catch {}
      try {
        console.log('==> 📦 Installing deps (npm ci)');
        await run('npm', ['ci']);
      } catch (e2) {
        console.error('❌ Dependency installation failed with npm install and npm ci.');
        console.error('   Try: npm cache clean --force && npm install --legacy-peer-deps');
        throw e2;
      }
    }
  }

  console.log('==> 🧱 Build');
  await run('npm', ['run', 'build']);

  console.log('==> 🧪 Unit tests');
  await run('npm', ['test', '--', '--passWithNoTests']);

  console.log('==> 🚀 Smoke: start server on :5849 (background)');
  const serverProc = spawn('npm', ['run', 'start'], { cwd: PROJECT_ROOT, shell: true, stdio: 'inherit' });

  try {
    await waitForHttp(5849, '/api/health', 20000);
    console.log('==> ✅ Health OK: http://localhost:5849/api/health');
  } finally {
    serverProc.kill('SIGINT');
  }

  console.log('==> 🧪 Smoke: CLI run basic example (dry-run)');
  const example = path.join(PROJECT_ROOT, 'docs/examples/basic/hello-world.yaml');
  await run('node', ['bin/claude-auto-worker', 'run', example, '--dry-run']);

  console.log('==> ✅ Local verify completed');
  console.log('\n==> 📝 Local no-Docker checklist:');
  console.log('   - ✅ Server responded at http://localhost:5849/api/health');
  console.log('   - ✅ CLI dry-run executed for docs/examples/basic/hello-world.yaml');
  console.log('   - ℹ️  For concurrent run:');
  console.log('       • Terminal A: npm run start:dev');
  console.log('       • Terminal B: node bin/claude-auto-worker run docs/examples/basic/hello-world.yaml --dry-run');
}

main().catch(err => {
  console.error('❌ Verify failed:', err.message || err);
  console.error('\nTroubleshooting:');
  console.error(' - Ensure Node.js 20.x LTS is installed');
  console.error(' - Ensure port 5849 is free (no conflicting process)');
  console.error(' - Install deps: npm ci');
  console.error(' - See docs: docs/user-guide/cli-usage-guide.md');
  process.exit(1);
});


