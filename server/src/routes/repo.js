import { Router } from 'express';
import { execSync } from 'node:child_process';
import path from 'node:path';
import cache from '../git/cache.js';
import { setRepoRoot, getRepoRoot } from '../git/parser.js';

const router = Router();

/**
 * GET /api/repo/status
 *
 * Returns the current repository selection state so the UI can decide
 * whether to show the folder-picker modal.
 */
router.get('/status', (_req, res) => {
  const repoRoot = getRepoRoot();
  res.json({
    selected: !!repoRoot,
    path: repoRoot,
    scannedAt: cache.scannedAt,
    ready: cache.repoReady,
  });
});

/**
 * POST /api/repo/select
 *
 * Body: { "path": "/absolute/path/to/repo" }
 *
 * Validates the given path is a git repository, sets it as the active
 * repository, resets the cache, and triggers a full scan.
 */
router.post('/select', async (req, res) => {
  const { path: repoPath } = req.body || {};

  if (!repoPath) {
    return res.status(400).json({ error: 'path is required' });
  }

  let resolvedPath;
  try {
    resolvedPath = path.resolve(repoPath);
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Validate the directory is a git repository
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: resolvedPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return res.status(400).json({
      error: 'The selected directory is not a git repository.',
    });
  }

  // Reset cached data and switch to the new repo
  cache.reset();
  setRepoRoot(resolvedPath);

  // Scan the new repo
  await cache.scan();

  res.json({
    selected: true,
    path: resolvedPath,
    scannedAt: cache.scannedAt,
    branches: cache.branches,
  });
});

export default router;
