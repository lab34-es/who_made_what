import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cache from './git/cache.js';
import branchesRouter from './routes/branches.js';
import authorsRouter from './routes/authors.js';
import activityRouter from './routes/activity.js';
import refreshRouter from './routes/refresh.js';
import foldersRouter from './routes/folders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

// --- API routes ---
app.use('/api/branches', branchesRouter);
app.use('/api/authors', authorsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/refresh', refreshRouter);
app.use('/api/folders', foldersRouter);

// --- Serve production frontend build ---
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res, next) => {
  // Only serve index.html for non-API routes
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

/**
 * Start the server on a random available port (or PORT env var).
 * Returns a promise that resolves with { port, server } once listening.
 */
export function startServer() {
  return new Promise(async (resolve, reject) => {
    try {
      await cache.scan();

      // Use port 0 to let the OS assign a random available port
      const port = process.env.PORT || 0;
      const server = app.listen(port, () => {
        const assignedPort = server.address().port;
        resolve({ port: assignedPort, server });
      });

      server.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// If this file is run directly (not imported), start the server
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const { port } = await startServer();
  console.log(`\n  who-made-what server running at http://localhost:${port}\n`);
}
