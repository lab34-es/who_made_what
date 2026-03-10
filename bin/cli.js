#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const repoRoot = process.cwd();

// --- Validate that CWD is inside a git repository ---
try {
  execSync('git rev-parse --is-inside-work-tree', {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch {
  console.error(
    '\n  Error: The current directory is not a git repository.\n' +
      '  Please run who_made_what from inside a git repository.\n',
  );
  process.exit(1);
}

// Make the repo root available to the server/parser
process.env.WHO_MADE_WHAT_REPO_ROOT = repoRoot;

// Start the server
const { startServer } = await import('../server/src/index.js');

const { port } = await startServer();

const url = `http://localhost:${port}`;
console.log(`\n  who_made_what running at ${url}\n`);

// Auto-open the browser
try {
  const open = (await import('open')).default;
  await open(url);
} catch {
  // Silently fail if browser can't be opened (e.g. headless server)
}
