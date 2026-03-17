import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const router = Router();

/**
 * Get filesystem root(s) based on the OS.
 * macOS/Linux: ['/']
 * Windows: ['C:\\', 'D:\\', ...] (available drive letters)
 */
function getSystemRoots() {
  if (os.platform() === 'win32') {
    try {
      const raw = execSync('wmic logicaldisk get name', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const drives = raw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[A-Z]:$/i.test(l))
        .map((l) => l.toUpperCase() + '\\');
      return drives.length > 0 ? drives : ['C:\\'];
    } catch {
      return ['C:\\'];
    }
  }
  return ['/'];
}

/**
 * GET /api/fs/list?path=<absolute-path>&showHidden=true
 *
 * Returns directories at the given path.
 * If no path is provided, returns the OS root(s) and the user's home directory.
 *
 * Response shape:
 *   {
 *     path: string | null,
 *     parent: string | null,
 *     homedir: string,
 *     entries: Array<{ name: string, path: string }>
 *   }
 */
router.get('/list', (req, res) => {
  const rawPath = req.query.path;
  const showHidden = req.query.showHidden === 'true';

  // No path → return system roots + home dir shortcut
  if (!rawPath) {
    const roots = getSystemRoots();
    return res.json({
      path: null,
      parent: null,
      homedir: os.homedir(),
      entries: roots.map((r) => ({ name: r, path: r })),
    });
  }

  // Resolve and normalize the path (handles .., //, etc.)
  let resolvedPath;
  try {
    resolvedPath = path.resolve(rawPath);
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const parentPath = path.dirname(resolvedPath);

  try {
    const dirents = fs.readdirSync(resolvedPath, { withFileTypes: true });
    const directories = [];

    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;

      // Skip hidden directories unless explicitly requested
      if (!showHidden && dirent.name.startsWith('.')) continue;

      const fullPath = path.join(resolvedPath, dirent.name);

      // Check we have read permission before including
      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        directories.push({
          name: dirent.name,
          path: fullPath,
        });
      } catch {
        // Skip directories we can't read (permission denied)
      }
    }

    directories.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      path: resolvedPath,
      parent: resolvedPath !== parentPath ? parentPath : null,
      homedir: os.homedir(),
      entries: directories,
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Path not found' });
    }
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    res.status(500).json({ error: 'Failed to read directory' });
  }
});

/**
 * GET /api/fs/is-git-repo?path=<absolute-path>
 *
 * Checks whether the given directory is inside a git repository.
 * Uses `git rev-parse --is-inside-work-tree` which works cross-platform.
 */
router.get('/is-git-repo', (req, res) => {
  const rawPath = req.query.path;
  if (!rawPath) {
    return res.status(400).json({ error: 'path is required' });
  }

  let resolvedPath;
  try {
    resolvedPath = path.resolve(rawPath);
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: resolvedPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    res.json({ isGitRepo: true, path: resolvedPath });
  } catch {
    res.json({ isGitRepo: false, path: resolvedPath });
  }
});

export default router;
