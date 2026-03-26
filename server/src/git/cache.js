import {
  parseBranches,
  parseCommits,
  deriveAuthors,
  buildHeatmap,
  buildTimeline,
  buildByDay,
  buildByHour,
  buildTopFiles,
  buildRecentFiles,
  buildDailyBreakdown,
  filterCommitsByFolder,
  filterCommitsByDate,
  listFolders,
  getRepoRoot,
} from './parser.js';

class GitCache {
  constructor() {
    /** @type {string[]} */
    this.branches = [];
    /** @type {Map<string, object[]>} branch -> commits (null key = all) */
    this.commitsByBranch = new Map();
    this.scannedAt = null;
    this.scanning = false;
    /** Whether a repository has been scanned and data is available. */
    this.repoReady = false;
  }

  /**
   * Clear all cached data. Called when switching repositories.
   */
  reset() {
    this.branches = [];
    this.commitsByBranch = new Map();
    this.scannedAt = null;
    this.repoReady = false;
  }

  /**
   * Full scan of the repository.  Called once at startup and on POST /api/refresh.
   * Skips silently if no repository root has been configured.
   */
  async scan() {
    if (this.scanning) return;
    if (!getRepoRoot()) return;
    this.scanning = true;
    const t0 = Date.now();

    try {
      console.log('[cache] Scanning repository…');

      // 1. Branches
      this.branches = parseBranches();
      console.log(`[cache]  ${this.branches.length} branches`);

      // 2. All-branches commit log
      const allCommits = parseCommits(null);
      this.commitsByBranch.set('__all__', allCommits);
      console.log(`[cache]  ${allCommits.length} commits (all branches)`);

      // 3. Per-branch commit logs (only local + commonly used)
      //    We limit to avoid scanning 128 branches individually.
      //    Individual branches are lazily loaded on first request.
      this.commitsByBranch.set('__preloaded__', true);

      this.scannedAt = new Date().toISOString();
      this.repoReady = true;
      console.log(`[cache] Scan complete in ${Date.now() - t0}ms`);
    } catch (err) {
      console.error('[cache] Scan failed:', err.message);
    } finally {
      this.scanning = false;
    }
  }

  /**
   * Get commits for a branch.  If the branch hasn't been scanned yet, do it
   * lazily and cache the result.
   */
  getCommits(branch) {
    if (!branch || branch === '__all__') {
      return this.commitsByBranch.get('__all__') || [];
    }

    if (this.commitsByBranch.has(branch)) {
      return this.commitsByBranch.get(branch);
    }

    // Lazy parse
    try {
      const commits = parseCommits(branch);
      this.commitsByBranch.set(branch, commits);
      return commits;
    } catch {
      return [];
    }
  }

  /**
   * High-level query helpers that consumers (routes) call.
   * All methods accept optional `folder`, `since`, and `until` parameters
   * to restrict results by folder path and/or date range.
   */

  /** Apply folder + date filters to the base commit list. */
  _filter(branch, folder, since, until) {
    return filterCommitsByDate(
      filterCommitsByFolder(this.getCommits(branch), folder),
      since,
      until,
    );
  }

  getAuthors(branch, folder, since, until) {
    return deriveAuthors(this._filter(branch, folder, since, until));
  }

  getHeatmap(branch, authorEmail, folder, since, until) {
    return buildHeatmap(
      this._filter(branch, folder, since, until),
      authorEmail,
    );
  }

  getTimeline(branch, authorEmail, folder, since, until) {
    return buildTimeline(
      this._filter(branch, folder, since, until),
      authorEmail,
    );
  }

  getByDay(branch, authorEmail, folder, since, until) {
    return buildByDay(this._filter(branch, folder, since, until), authorEmail);
  }

  getByHour(branch, authorEmail, folder, since, until) {
    return buildByHour(this._filter(branch, folder, since, until), authorEmail);
  }

  getTopFiles(branch, authorEmail, { page, pageSize }, folder, since, until) {
    return buildTopFiles(
      this._filter(branch, folder, since, until),
      authorEmail,
      { page, pageSize },
    );
  }

  getRecentFiles(branch, authorEmail, { page, pageSize }, folder, since, until) {
    return buildRecentFiles(
      this._filter(branch, folder, since, until),
      authorEmail,
      { page, pageSize },
    );
  }

  getDailyBreakdown(branch, authorEmail, folder, since, until) {
    return buildDailyBreakdown(
      this._filter(branch, folder, since, until),
      authorEmail,
    );
  }

  getFolders(folderPath) {
    return listFolders(folderPath);
  }
}

// Singleton
const cache = new GitCache();
export default cache;
