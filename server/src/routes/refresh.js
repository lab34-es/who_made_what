import { Router } from 'express';
import cache from '../git/cache.js';

const router = Router();

router.post('/', async (_req, res) => {
  await cache.scan();
  res.json({ scannedAt: cache.scannedAt, branches: cache.branches.length });
});

export default router;
