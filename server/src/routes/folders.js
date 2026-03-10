import { Router } from 'express';
import cache from '../git/cache.js';

const router = Router();

/**
 * GET /api/folders?path=
 * Returns the immediate subdirectories at the given path (or repo root if empty).
 */
router.get('/', (req, res) => {
  const folderPath = req.query.path || '';
  const folders = cache.getFolders(folderPath);
  res.json({ folders });
});

export default router;
