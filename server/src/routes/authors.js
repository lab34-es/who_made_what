import { Router } from 'express';
import cache from '../git/cache.js';

const router = Router();

router.get('/', (req, res) => {
  const branch = req.query.branch || null;
  const folder = req.query.folder || null;
  const since = req.query.since || null;
  const until = req.query.until || null;
  res.json(cache.getAuthors(branch, folder, since, until));
});

export default router;
