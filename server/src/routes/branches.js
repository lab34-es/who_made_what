import { Router } from 'express';
import cache from '../git/cache.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    branches: cache.branches,
    scannedAt: cache.scannedAt,
  });
});

export default router;
