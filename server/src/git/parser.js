import { execSync } from 'node:child_process';
import path from 'node:path';

// Mutable repo root — set at runtime via setRepoRoot().
// Falls back to the env var (for backwards compat) or null (no repo selected).
let REPO_ROOT = process.env.WHO_MADE_WHAT_REPO_ROOT || null;

/**
 * Update the repository root path used by all git commands.
 * @param {string} newRoot - Absolute path to a git repository.
 */
export function setRepoRoot(newRoot) {
  REPO_ROOT = newRoot;
}

/**
 * Get the current repository root path.
 * @returns {string|null}
 */
export function getRepoRoot() {
  return REPO_ROOT;
}

const DELIMITER = '<<--COMMIT-->>';
const FIELD_SEP = '<<|>>';

/**
 * Run a git command synchronously and return trimmed stdout.
 */
function git(args, maxBuffer = 100 * 1024 * 1024) {
  return execSync(`git ${args}`, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    maxBuffer,
  }).trim();
}

/**
 * Parse all branches (local + remote tracking).
 * Returns an array of branch names. Remote branches are stripped of
 * the "remotes/origin/" prefix and deduplicated against local ones.
 */
export function parseBranches() {
  const raw = git('branch -a --no-color');
  const seen = new Set();
  const branches = [];

  for (const line of raw.split('\n')) {
    let name = line.replace(/^\*?\s+/, '').trim();
    if (!name || name.includes('->')) continue; // skip HEAD aliases
    name = name.replace(/^remotes\/origin\//, ''); // normalise
    if (!seen.has(name)) {
      seen.add(name);
      branches.push(name);
    }
  }

  return branches.sort();
}

/**
 * Parse the full commit log.
 *
 * @param {string|null} branch - Restrict to a single branch. null = all branches.
 * @returns {Array<Object>} commits
 */
export function parseCommits(branch = null) {
  const branchArg = branch ? branch : '--all';

  const format = [
    '%H', // hash
    '%an', // author name
    '%ae', // author email
    '%aI', // author date ISO 8601
    '%s', // subject
  ].join(FIELD_SEP);

  const raw = git(
    `log ${branchArg} --format="${DELIMITER}${format}" --numstat`,
  );

  if (!raw) return [];

  const chunks = raw.split(DELIMITER).filter(Boolean);
  const commits = [];

  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    const headerLine = lines[0];
    if (!headerLine) continue;

    const parts = headerLine.split(FIELD_SEP);
    if (parts.length < 5) continue;

    const [hash, authorName, authorEmail, dateISO, subject] = parts;

    const files = [];
    for (let i = 1; i < lines.length; i++) {
      const fl = lines[i].trim();
      if (!fl) continue;
      const [added, removed, filePath] = fl.split('\t');
      if (!filePath) continue;
      files.push({
        path: filePath,
        added: added === '-' ? 0 : parseInt(added, 10),
        removed: removed === '-' ? 0 : parseInt(removed, 10),
      });
    }

    commits.push({
      hash,
      authorName: authorName.trim(),
      authorEmail: authorEmail.trim().toLowerCase(),
      date: dateISO.trim(),
      subject: subject.trim(),
      files,
      totalAdded: files.reduce((s, f) => s + f.added, 0),
      totalRemoved: files.reduce((s, f) => s + f.removed, 0),
    });
  }

  return commits;
}

/**
 * Filter commits to only include files under a given folder prefix.
 * Returns new commit objects with filtered file lists and recalculated totals.
 * Commits with zero matching files are excluded.
 *
 * @param {Array} commits
 * @param {string|null} folder - e.g. "server/src". null = no filtering.
 * @returns {Array}
 */
export function filterCommitsByFolder(commits, folder = null) {
  if (!folder) return commits;

  const prefix = folder.endsWith('/') ? folder : folder + '/';

  const result = [];
  for (const c of commits) {
    const filteredFiles = c.files.filter((f) => f.path.startsWith(prefix));
    if (filteredFiles.length === 0) continue;

    result.push({
      ...c,
      files: filteredFiles,
      totalAdded: filteredFiles.reduce((s, f) => s + f.added, 0),
      totalRemoved: filteredFiles.reduce((s, f) => s + f.removed, 0),
    });
  }

  return result;
}

/**
 * List immediate subdirectories at a given path using git ls-tree.
 * @param {string} folderPath - e.g. "server/src" or "" for root.
 * @returns {string[]} - array of folder names (not full paths).
 */
export function listFolders(folderPath = '') {
  try {
    const treePath = folderPath ? `HEAD:${folderPath}` : 'HEAD';
    const raw = git(`ls-tree -d --name-only ${treePath}`);
    if (!raw) return [];
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Filter commits by date range.
 *
 * @param {Array} commits
 * @param {string|null} since - Inclusive lower bound, e.g. "2025-01-15". null = no lower bound.
 * @param {string|null} until - Inclusive upper bound, e.g. "2025-03-10". null = no upper bound.
 * @returns {Array}
 */
export function filterCommitsByDate(commits, since = null, until = null) {
  if (!since && !until) return commits;
  return commits.filter((c) => {
    const d = c.date.slice(0, 10); // "YYYY-MM-DD"
    if (since && d < since) return false;
    if (until && d > until) return false;
    return true;
  });
}

/**
 * Filter commits by one or more author emails.
 * @param {Array} commits
 * @param {string|string[]|null} authorEmail - single email, array of emails, or null for no filtering.
 * @returns {Array}
 */
function filterByAuthor(commits, authorEmail) {
  if (!authorEmail) return commits;
  if (Array.isArray(authorEmail)) {
    if (authorEmail.length === 0) return commits;
    const set = new Set(authorEmail);
    return commits.filter((c) => set.has(c.authorEmail));
  }
  return commits.filter((c) => c.authorEmail === authorEmail);
}

/**
 * Derive author summaries from a list of commits.
 */
export function deriveAuthors(commits) {
  const map = new Map();

  for (const c of commits) {
    const key = c.authorEmail;
    if (!map.has(key)) {
      map.set(key, {
        name: c.authorName,
        email: c.authorEmail,
        commits: 0,
        linesAdded: 0,
        linesRemoved: 0,
        firstCommit: c.date,
        lastCommit: c.date,
        fileTypes: {},
      });
    }

    const author = map.get(key);
    author.commits += 1;
    author.linesAdded += c.totalAdded;
    author.linesRemoved += c.totalRemoved;

    if (c.date < author.firstCommit) author.firstCommit = c.date;
    if (c.date > author.lastCommit) author.lastCommit = c.date;

    // Update the name to the most recent one used
    author.name = c.authorName;

    for (const f of c.files) {
      const ext = path.extname(f.path) || '(no ext)';
      if (!author.fileTypes[ext])
        author.fileTypes[ext] = { added: 0, removed: 0, count: 0 };
      author.fileTypes[ext].added += f.added;
      author.fileTypes[ext].removed += f.removed;
      author.fileTypes[ext].count += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.commits - a.commits);
}

/**
 * Build heatmap data: { "YYYY-MM-DD": count } for the last 53 weeks.
 */
export function buildHeatmap(commits, authorEmail = null) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 52 * 7);

  const filtered = filterByAuthor(commits, authorEmail);

  const map = {};
  for (const c of filtered) {
    const d = c.date.slice(0, 10); // YYYY-MM-DD
    if (d >= start.toISOString().slice(0, 10)) {
      map[d] = (map[d] || 0) + 1;
    }
  }

  return map;
}

/**
 * Build timeline data: commits per week, optionally grouped by author.
 */
export function buildTimeline(commits, authorEmail = null) {
  const filtered = filterByAuthor(commits, authorEmail);
  const weekMap = {};

  for (const c of filtered) {
    const d = new Date(c.date);
    // Get Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weekMap[weekKey]) weekMap[weekKey] = {};
    const authorKey = c.authorEmail;
    weekMap[weekKey][authorKey] = (weekMap[weekKey][authorKey] || 0) + 1;
  }

  // Convert to array sorted by week
  return Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, authors]) => ({
      week,
      total: Object.values(authors).reduce((s, v) => s + v, 0),
      ...authors,
    }));
}

/**
 * Commits grouped by day of week (0=Sun … 6=Sat).
 */
export function buildByDay(commits, authorEmail = null) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = new Array(7).fill(0);

  const filtered = filterByAuthor(commits, authorEmail);

  for (const c of filtered) {
    const day = new Date(c.date).getDay();
    counts[day] += 1;
  }

  return dayNames.map((name, i) => ({ day: name, commits: counts[i] }));
}

/**
 * Commits grouped by hour (0–23).
 */
export function buildByHour(commits, authorEmail = null) {
  const counts = new Array(24).fill(0);

  const filtered = filterByAuthor(commits, authorEmail);

  for (const c of filtered) {
    const hour = new Date(c.date).getHours();
    counts[hour] += 1;
  }

  return counts.map((commits, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    commits,
  }));
}

/**
 * Daily breakdown: for each day, list contributors with commit count
 * and lines added/removed. Days are sorted newest-first, contributors
 * within each day sorted by commit count descending.
 *
 * @param {Array} commits
 * @param {string|string[]|null} authorEmail
 * @returns {Array<{ date: string, contributors: Array<{ name: string, email: string, commits: number, linesAdded: number, linesRemoved: number }> }>}
 */
export function buildDailyBreakdown(commits, authorEmail = null) {
  const filtered = filterByAuthor(commits, authorEmail);

  // Group by day, then by author
  const dayMap = {};

  for (const c of filtered) {
    const day = c.date.slice(0, 10); // YYYY-MM-DD
    if (!dayMap[day]) dayMap[day] = {};

    const key = c.authorEmail;
    if (!dayMap[day][key]) {
      dayMap[day][key] = {
        name: c.authorName,
        email: c.authorEmail,
        commits: 0,
        linesAdded: 0,
        linesRemoved: 0,
      };
    }

    const entry = dayMap[day][key];
    entry.commits += 1;
    entry.linesAdded += c.totalAdded;
    entry.linesRemoved += c.totalRemoved;
    // Keep the most recent name
    entry.name = c.authorName;
  }

  return Object.entries(dayMap)
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, authors]) => ({
      date,
      contributors: Object.values(authors).sort(
        (a, b) => b.commits - a.commits,
      ),
    }));
}

/**
 * Most recently updated files.
 * For each file, returns when it was last modified, who modified it, and
 * the number of lines added/removed in that last commit.
 */
export function buildRecentFiles(
  commits,
  authorEmail = null,
  { page = 1, pageSize = 20 } = {},
) {
  const filtered = filterByAuthor(commits, authorEmail);

  // commits are already sorted newest-first from git log
  const seen = new Map(); // path -> record

  for (const c of filtered) {
    for (const f of c.files) {
      if (seen.has(f.path)) continue; // we only want the most recent touch
      seen.set(f.path, {
        path: f.path,
        date: c.date,
        author: c.authorName,
        authorEmail: c.authorEmail,
        added: f.added,
        removed: f.removed,
      });
    }
  }

  // Sort by date descending (most recent first)
  const all = Array.from(seen.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const total = all.length;
  const start = (page - 1) * pageSize;
  const data = all.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}

/**
 * Top N most-modified files (paginated).
 */
export function buildTopFiles(
  commits,
  authorEmail = null,
  { page = 1, pageSize = 20 } = {},
) {
  const filtered = filterByAuthor(commits, authorEmail);

  const map = {};
  for (const c of filtered) {
    for (const f of c.files) {
      if (!map[f.path]) map[f.path] = { added: 0, removed: 0, commits: 0 };
      map[f.path].added += f.added;
      map[f.path].removed += f.removed;
      map[f.path].commits += 1;
    }
  }

  const all = Object.entries(map)
    .map(([filePath, stats]) => ({ path: filePath, ...stats }))
    .sort((a, b) => b.commits - a.commits);

  const total = all.length;
  const start = (page - 1) * pageSize;
  const data = all.slice(start, start + pageSize);

  return { data, total, page, pageSize };
}
