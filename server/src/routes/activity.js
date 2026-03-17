import { Router } from 'express';
import cache from '../git/cache.js';

const router = Router();

/**
 * Parse the `author` query parameter.
 * Supports comma-separated emails: ?author=a@x.com,b@x.com
 * Returns null (no filter), a single string, or an array.
 */
function parseAuthor(raw) {
  if (!raw) return null;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return list;
}

router.get('/heatmap', (req, res) => {
  const { branch, author, folder, since, until } = req.query;
  res.json(
    cache.getHeatmap(
      branch || null,
      parseAuthor(author),
      folder || null,
      since || null,
      until || null,
    ),
  );
});

router.get('/timeline', (req, res) => {
  const { branch, folder, since, until } = req.query;
  res.json(
    cache.getTimeline(
      branch || null,
      folder || null,
      since || null,
      until || null,
    ),
  );
});

router.get('/by-day', (req, res) => {
  const { branch, author, folder, since, until } = req.query;
  res.json(
    cache.getByDay(
      branch || null,
      parseAuthor(author),
      folder || null,
      since || null,
      until || null,
    ),
  );
});

router.get('/by-hour', (req, res) => {
  const { branch, author, folder, since, until } = req.query;
  res.json(
    cache.getByHour(
      branch || null,
      parseAuthor(author),
      folder || null,
      since || null,
      until || null,
    ),
  );
});

router.get('/top-files', (req, res) => {
  const { branch, author, page, pageSize, folder, since, until } = req.query;
  res.json(
    cache.getTopFiles(
      branch || null,
      parseAuthor(author),
      {
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      },
      folder || null,
      since || null,
      until || null,
    ),
  );
});

router.get('/recent-files', (req, res) => {
  const { branch, author, page, pageSize, folder, since, until } = req.query;
  res.json(
    cache.getRecentFiles(
      branch || null,
      parseAuthor(author),
      {
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      },
      folder || null,
      since || null,
      until || null,
    ),
  );
});

export default router;
