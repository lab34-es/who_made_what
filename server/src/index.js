import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import cache from "./git/cache.js";
import { getRepoRoot } from "./git/parser.js";
import fsRouter from "./routes/fs.js";
import repoRouter from "./routes/repo.js";
import branchesRouter from "./routes/branches.js";
import authorsRouter from "./routes/authors.js";
import activityRouter from "./routes/activity.js";
import refreshRouter from "./routes/refresh.js";
import foldersRouter from "./routes/folders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

// --- API routes (always available, no repo required) ---
app.use("/api/fs", fsRouter);
app.use("/api/repo", repoRouter);

// Middleware: reject requests to data routes when no repo is selected
function requireRepo(_req, res, next) {
  if (!cache.repoReady) {
    return res.status(503).json({ error: "No repository selected" });
  }
  next();
}

// --- API routes (require an active repository) ---
app.use("/api/branches", requireRepo, branchesRouter);
app.use("/api/authors", requireRepo, authorsRouter);
app.use("/api/activity", requireRepo, activityRouter);
app.use("/api/refresh", requireRepo, refreshRouter);
app.use("/api/folders", requireRepo, foldersRouter);

// --- Serve production frontend build ---
const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for any non-API route
  app.get("/{*splat}", (_req, res, next) => {
    if (_req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.warn(`[warn] Frontend build not found at ${clientDist}`);
  console.warn('[warn] Run "npm run build" to build the client.');
}

/**
 * Start the server on a random available port (or PORT env var).
 * Returns a promise that resolves with { port, server } once listening.
 */
export function startServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // Only scan on startup if a repo root was pre-configured (env var)
      if (getRepoRoot()) {
        await cache.scan();
      }

      // Use port 0 to let the OS assign a random available port
      const port = process.env.PORT || 4200;
      const server = app.listen(port, () => {
        const assignedPort = server.address().port;
        resolve({ port: assignedPort, server });
      });

      server.on("error", reject);
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
  console.log(`\n  who_made_what server running at http://localhost:${port}\n`);
}
