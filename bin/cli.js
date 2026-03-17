#!/usr/bin/env node

// Start the server — the user selects a repository folder via the UI.
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
