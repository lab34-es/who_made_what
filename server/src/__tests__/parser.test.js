import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ─── Mock child_process before importing parser ──────────────────────────────
// We need to intercept execSync to avoid shelling out to real git.
let mockExecSync;

jest.unstable_mockModule('node:child_process', () => ({
  execSync: (...args) => mockExecSync(...args),
}));

// Dynamic import *after* mocks are set up (required by Jest ESM support)
const {
  parseBranches,
  parseCommits,
  filterCommitsByFolder,
  filterCommitsByDate,
  deriveAuthors,
  buildHeatmap,
  buildTimeline,
  buildByDay,
  buildByHour,
  buildTopFiles,
  buildRecentFiles,
  listFolders,
  setRepoRoot,
  getRepoRoot,
} = await import('../git/parser.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DELIMITER = '<<--COMMIT-->>';
const FIELD_SEP = '<<|>>';

/**
 * Build a fake git log output string from an array of commit objects.
 */
function fakeGitLog(commits) {
  return commits
    .map((c) => {
      const header = [c.hash, c.name, c.email, c.date, c.subject].join(
        FIELD_SEP,
      );
      const numstat = (c.files || [])
        .map((f) => `${f.added}\t${f.removed}\t${f.path}`)
        .join('\n');
      return `${DELIMITER}${header}\n${numstat}`;
    })
    .join('\n');
}

/** A set of sample commits used across multiple test suites. */
function sampleCommits() {
  return [
    {
      hash: 'abc123',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      date: '2025-06-10T10:00:00+00:00',
      subject: 'feat: add login',
      files: [
        { path: 'server/src/auth.js', added: 50, removed: 0 },
        { path: 'server/src/index.js', added: 5, removed: 2 },
      ],
      totalAdded: 55,
      totalRemoved: 2,
    },
    {
      hash: 'def456',
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
      date: '2025-06-08T14:30:00+00:00',
      subject: 'fix: resolve crash',
      files: [{ path: 'client/src/App.jsx', added: 10, removed: 3 }],
      totalAdded: 10,
      totalRemoved: 3,
    },
    {
      hash: 'ghi789',
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      date: '2025-06-05T09:15:00+00:00',
      subject: 'chore: cleanup',
      files: [
        { path: 'server/src/utils.js', added: 0, removed: 20 },
        { path: 'README.md', added: 2, removed: 1 },
      ],
      totalAdded: 2,
      totalRemoved: 21,
    },
    {
      hash: 'jkl012',
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
      date: '2025-05-28T16:00:00+00:00',
      subject: 'docs: update readme',
      files: [{ path: 'README.md', added: 15, removed: 5 }],
      totalAdded: 15,
      totalRemoved: 5,
    },
  ];
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('parser', () => {
  beforeEach(() => {
    mockExecSync = jest.fn();
  });

  // ────────────────────────────────────────────────────────────────────────
  // parseBranches
  // ────────────────────────────────────────────────────────────────────────
  describe('parseBranches', () => {
    it('should parse local and remote branches, deduplicate, and sort', () => {
      mockExecSync.mockReturnValue(
        [
          '* main',
          '  develop',
          '  feature/login',
          '  remotes/origin/main',
          '  remotes/origin/develop',
          '  remotes/origin/feature/signup',
          '  remotes/origin/HEAD -> origin/main',
        ].join('\n'),
      );

      const branches = parseBranches();

      expect(branches).toEqual([
        'develop',
        'feature/login',
        'feature/signup',
        'main',
      ]);
    });

    it('should return empty array for empty output', () => {
      mockExecSync.mockReturnValue('');

      const branches = parseBranches();
      expect(branches).toEqual([]);
    });

    it('should handle single branch', () => {
      mockExecSync.mockReturnValue('* main');

      const branches = parseBranches();
      expect(branches).toEqual(['main']);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // parseCommits
  // ────────────────────────────────────────────────────────────────────────
  describe('parseCommits', () => {
    it('should parse commits with files and stats', () => {
      const raw = fakeGitLog([
        {
          hash: 'abc123',
          name: 'Alice',
          email: 'alice@example.com',
          date: '2025-06-10T10:00:00+00:00',
          subject: 'feat: add login',
          files: [
            { added: 50, removed: 0, path: 'server/src/auth.js' },
            { added: 5, removed: 2, path: 'server/src/index.js' },
          ],
        },
      ]);
      mockExecSync.mockReturnValue(raw);

      const commits = parseCommits('main');

      expect(commits).toHaveLength(1);
      expect(commits[0]).toEqual({
        hash: 'abc123',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        date: '2025-06-10T10:00:00+00:00',
        subject: 'feat: add login',
        files: [
          { path: 'server/src/auth.js', added: 50, removed: 0 },
          { path: 'server/src/index.js', added: 5, removed: 2 },
        ],
        totalAdded: 55,
        totalRemoved: 2,
      });
    });

    it('should return empty array for empty output', () => {
      mockExecSync.mockReturnValue('');

      const commits = parseCommits();
      expect(commits).toEqual([]);
    });

    it('should handle binary files (- for added/removed)', () => {
      const raw = fakeGitLog([
        {
          hash: 'bin111',
          name: 'Charlie',
          email: 'charlie@example.com',
          date: '2025-06-01T00:00:00+00:00',
          subject: 'add image',
          files: [{ added: '-', removed: '-', path: 'assets/logo.png' }],
        },
      ]);
      mockExecSync.mockReturnValue(raw);

      const commits = parseCommits();
      expect(commits[0].files[0]).toEqual({
        path: 'assets/logo.png',
        added: 0,
        removed: 0,
      });
      expect(commits[0].totalAdded).toBe(0);
      expect(commits[0].totalRemoved).toBe(0);
    });

    it('should parse multiple commits', () => {
      const raw = fakeGitLog([
        {
          hash: 'aaa',
          name: 'Alice',
          email: 'alice@example.com',
          date: '2025-06-10T10:00:00+00:00',
          subject: 'first',
          files: [{ added: 10, removed: 0, path: 'a.js' }],
        },
        {
          hash: 'bbb',
          name: 'Bob',
          email: 'bob@example.com',
          date: '2025-06-09T10:00:00+00:00',
          subject: 'second',
          files: [{ added: 5, removed: 3, path: 'b.js' }],
        },
      ]);
      mockExecSync.mockReturnValue(raw);

      const commits = parseCommits();
      expect(commits).toHaveLength(2);
      expect(commits[0].hash).toBe('aaa');
      expect(commits[1].hash).toBe('bbb');
    });

    it('should use --all flag when no branch is specified', () => {
      mockExecSync.mockReturnValue('');
      parseCommits(null);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--all'),
        expect.any(Object),
      );
    });

    it('should use branch name when specified', () => {
      mockExecSync.mockReturnValue('');
      parseCommits('develop');
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('develop'),
        expect.any(Object),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // filterCommitsByFolder
  // ────────────────────────────────────────────────────────────────────────
  describe('filterCommitsByFolder', () => {
    const commits = sampleCommits();

    it('should return all commits when folder is null', () => {
      const result = filterCommitsByFolder(commits, null);
      expect(result).toBe(commits); // Same reference
    });

    it('should filter commits to only include files under the given folder', () => {
      const result = filterCommitsByFolder(commits, 'server/src');

      expect(result).toHaveLength(2); // Only commits with server/src files
      expect(result[0].hash).toBe('abc123');
      expect(result[0].files).toHaveLength(2);
      expect(result[1].hash).toBe('ghi789');
      expect(result[1].files).toHaveLength(1);
      expect(result[1].files[0].path).toBe('server/src/utils.js');
    });

    it('should recalculate totalAdded and totalRemoved for filtered files', () => {
      const result = filterCommitsByFolder(commits, 'client/src');

      expect(result).toHaveLength(1);
      expect(result[0].totalAdded).toBe(10);
      expect(result[0].totalRemoved).toBe(3);
    });

    it('should exclude commits with zero matching files', () => {
      const result = filterCommitsByFolder(commits, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    it('should handle folder with trailing slash', () => {
      const result = filterCommitsByFolder(commits, 'server/src/');
      expect(result).toHaveLength(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // filterCommitsByDate
  // ────────────────────────────────────────────────────────────────────────
  describe('filterCommitsByDate', () => {
    const commits = sampleCommits();

    it('should return all commits when both since and until are null', () => {
      const result = filterCommitsByDate(commits, null, null);
      expect(result).toBe(commits);
    });

    it('should filter by since date (inclusive)', () => {
      const result = filterCommitsByDate(commits, '2025-06-08', null);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('abc123');
      expect(result[1].hash).toBe('def456');
    });

    it('should filter by until date (inclusive)', () => {
      const result = filterCommitsByDate(commits, null, '2025-06-05');

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('ghi789');
      expect(result[1].hash).toBe('jkl012');
    });

    it('should filter by both since and until', () => {
      const result = filterCommitsByDate(commits, '2025-06-05', '2025-06-08');

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('def456');
      expect(result[1].hash).toBe('ghi789');
    });

    it('should return empty array when no commits match', () => {
      const result = filterCommitsByDate(commits, '2025-12-01', '2025-12-31');
      expect(result).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // deriveAuthors
  // ────────────────────────────────────────────────────────────────────────
  describe('deriveAuthors', () => {
    const commits = sampleCommits();

    it('should aggregate author statistics', () => {
      const authors = deriveAuthors(commits);

      expect(authors).toHaveLength(2);

      // Sorted by commit count descending. Both have 2, so order may depend
      // on insertion order. Alice is first in the commits list.
      const alice = authors.find((a) => a.email === 'alice@example.com');
      const bob = authors.find((a) => a.email === 'bob@example.com');

      expect(alice).toBeDefined();
      expect(alice.commits).toBe(2);
      expect(alice.linesAdded).toBe(57); // 55 + 2
      expect(alice.linesRemoved).toBe(23); // 2 + 21

      expect(bob).toBeDefined();
      expect(bob.commits).toBe(2);
      expect(bob.linesAdded).toBe(25); // 10 + 15
      expect(bob.linesRemoved).toBe(8); // 3 + 5
    });

    it('should track first and last commit dates', () => {
      const authors = deriveAuthors(commits);
      const alice = authors.find((a) => a.email === 'alice@example.com');

      expect(alice.firstCommit).toBe('2025-06-05T09:15:00+00:00');
      expect(alice.lastCommit).toBe('2025-06-10T10:00:00+00:00');
    });

    it('should track file type statistics', () => {
      const authors = deriveAuthors(commits);
      const alice = authors.find((a) => a.email === 'alice@example.com');

      expect(alice.fileTypes['.js']).toBeDefined();
      expect(alice.fileTypes['.js'].count).toBe(3); // auth.js, index.js, utils.js
      expect(alice.fileTypes['.md']).toBeDefined();
      expect(alice.fileTypes['.md'].count).toBe(1);
    });

    it('should return empty array for empty commits', () => {
      expect(deriveAuthors([])).toEqual([]);
    });

    it('should use most recent author name', () => {
      const authors = deriveAuthors(commits);
      const alice = authors.find((a) => a.email === 'alice@example.com');
      // The last commit processed for alice is ghi789 (third in list), name is 'Alice'
      expect(alice.name).toBe('Alice');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // buildHeatmap
  // ────────────────────────────────────────────────────────────────────────
  describe('buildHeatmap', () => {
    it('should count commits per day', () => {
      // Use dates within the last 52 weeks from "now" to ensure they're included
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 5);
      const dateStr = recentDate.toISOString();

      const commits = [
        {
          hash: 'a',
          authorEmail: 'alice@example.com',
          date: dateStr,
          files: [],
          totalAdded: 0,
          totalRemoved: 0,
        },
        {
          hash: 'b',
          authorEmail: 'alice@example.com',
          date: dateStr,
          files: [],
          totalAdded: 0,
          totalRemoved: 0,
        },
        {
          hash: 'c',
          authorEmail: 'bob@example.com',
          date: dateStr,
          files: [],
          totalAdded: 0,
          totalRemoved: 0,
        },
      ];

      const heatmap = buildHeatmap(commits);
      const dayKey = dateStr.slice(0, 10);

      expect(heatmap[dayKey]).toBe(3);
    });

    it('should filter by author when provided', () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 5);
      const dateStr = recentDate.toISOString();

      const commits = [
        { hash: 'a', authorEmail: 'alice@example.com', date: dateStr },
        { hash: 'b', authorEmail: 'bob@example.com', date: dateStr },
      ];

      const heatmap = buildHeatmap(commits, 'alice@example.com');
      const dayKey = dateStr.slice(0, 10);

      expect(heatmap[dayKey]).toBe(1);
    });

    it('should exclude commits older than 52 weeks', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);

      const commits = [
        { hash: 'a', authorEmail: 'a@a.com', date: oldDate.toISOString() },
      ];

      const heatmap = buildHeatmap(commits);
      expect(Object.keys(heatmap)).toHaveLength(0);
    });

    it('should return empty object for empty commits', () => {
      expect(buildHeatmap([])).toEqual({});
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // buildTimeline
  // ────────────────────────────────────────────────────────────────────────
  describe('buildTimeline', () => {
    it('should group commits by week with author breakdown', () => {
      const commits = [
        {
          hash: 'a',
          authorEmail: 'alice@example.com',
          date: '2025-06-09T10:00:00+00:00', // Monday
        },
        {
          hash: 'b',
          authorEmail: 'bob@example.com',
          date: '2025-06-10T10:00:00+00:00', // Tuesday same week
        },
        {
          hash: 'c',
          authorEmail: 'alice@example.com',
          date: '2025-06-02T10:00:00+00:00', // Previous week Monday
        },
      ];

      const timeline = buildTimeline(commits);

      expect(timeline).toHaveLength(2);
      expect(timeline[0].total).toBe(1); // Earlier week
      expect(timeline[1].total).toBe(2); // Later week
    });

    it('should return empty array for empty commits', () => {
      expect(buildTimeline([])).toEqual([]);
    });

    it('should sort by week ascending', () => {
      const commits = [
        {
          hash: 'b',
          authorEmail: 'a@a.com',
          date: '2025-06-16T10:00:00+00:00',
        },
        {
          hash: 'a',
          authorEmail: 'a@a.com',
          date: '2025-06-02T10:00:00+00:00',
        },
      ];

      const timeline = buildTimeline(commits);
      expect(timeline[0].week < timeline[1].week).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // buildByDay
  // ────────────────────────────────────────────────────────────────────────
  describe('buildByDay', () => {
    it('should return 7 day entries', () => {
      const result = buildByDay([]);
      expect(result).toHaveLength(7);
      expect(result.map((d) => d.day)).toEqual([
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
      ]);
    });

    it('should count commits per day of week', () => {
      // 2025-06-09 is a Monday, 2025-06-10 is Tuesday
      const commits = [
        {
          hash: 'a',
          authorEmail: 'a@a.com',
          date: '2025-06-09T10:00:00+00:00',
        },
        {
          hash: 'b',
          authorEmail: 'a@a.com',
          date: '2025-06-09T14:00:00+00:00',
        },
        {
          hash: 'c',
          authorEmail: 'a@a.com',
          date: '2025-06-10T10:00:00+00:00',
        },
      ];

      const result = buildByDay(commits);
      const monday = result.find((d) => d.day === 'Mon');
      const tuesday = result.find((d) => d.day === 'Tue');

      expect(monday.commits).toBe(2);
      expect(tuesday.commits).toBe(1);
    });

    it('should filter by author', () => {
      const commits = [
        {
          hash: 'a',
          authorEmail: 'alice@example.com',
          date: '2025-06-09T10:00:00+00:00',
        },
        {
          hash: 'b',
          authorEmail: 'bob@example.com',
          date: '2025-06-09T14:00:00+00:00',
        },
      ];

      const result = buildByDay(commits, 'alice@example.com');
      const monday = result.find((d) => d.day === 'Mon');
      expect(monday.commits).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // buildByHour
  // ────────────────────────────────────────────────────────────────────────
  describe('buildByHour', () => {
    it('should return 24 hour entries', () => {
      const result = buildByHour([]);
      expect(result).toHaveLength(24);
      expect(result[0].hour).toBe('00:00');
      expect(result[23].hour).toBe('23:00');
    });

    it('should count commits per hour', () => {
      const commits = [
        { hash: 'a', authorEmail: 'a@a.com', date: '2025-06-09T10:00:00' },
        { hash: 'b', authorEmail: 'a@a.com', date: '2025-06-10T10:30:00' },
        { hash: 'c', authorEmail: 'a@a.com', date: '2025-06-11T14:00:00' },
      ];

      const result = buildByHour(commits);
      expect(result[10].commits).toBe(2);
      expect(result[14].commits).toBe(1);
    });

    it('should filter by author', () => {
      const commits = [
        {
          hash: 'a',
          authorEmail: 'alice@example.com',
          date: '2025-06-09T10:00:00',
        },
        {
          hash: 'b',
          authorEmail: 'bob@example.com',
          date: '2025-06-09T10:30:00',
        },
      ];

      const result = buildByHour(commits, 'alice@example.com');
      expect(result[10].commits).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // buildTopFiles
  // ────────────────────────────────────────────────────────────────────────
  describe('buildTopFiles', () => {
    const commits = sampleCommits();

    it('should aggregate file modification stats and sort by commit count', () => {
      const result = buildTopFiles(commits);

      // README.md appears in 2 commits, everything else in 1
      expect(result.data[0].path).toBe('README.md');
      expect(result.data[0].commits).toBe(2);
      expect(result.data[0].added).toBe(17); // 2 + 15
      expect(result.data[0].removed).toBe(6); // 1 + 5
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 20);
    });

    it('should respect the pageSize parameter', () => {
      const result = buildTopFiles(commits, null, { page: 1, pageSize: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by author', () => {
      const result = buildTopFiles(commits, 'alice@example.com');

      // Only Alice's files
      const paths = result.data.map((f) => f.path);
      expect(paths).toContain('server/src/auth.js');
      expect(paths).toContain('server/src/index.js');
      expect(paths).toContain('server/src/utils.js');
      expect(paths).toContain('README.md');
      // Bob's file should not appear
      expect(paths).not.toContain('client/src/App.jsx');
    });

    it('should filter by array of authors', () => {
      const result = buildTopFiles(commits, ['bob@example.com']);

      const paths = result.data.map((f) => f.path);
      expect(paths).toContain('client/src/App.jsx');
      expect(paths).toContain('README.md');
      expect(paths).not.toContain('server/src/auth.js');
    });

    it('should return empty data for empty commits', () => {
      const result = buildTopFiles([]);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // buildRecentFiles
  // ────────────────────────────────────────────────────────────────────────
  describe('buildRecentFiles', () => {
    const commits = sampleCommits();

    it('should return the most recently modified files sorted by date', () => {
      const result = buildRecentFiles(commits);

      // First file should be from the most recent commit
      expect(result.data[0].date).toBe('2025-06-10T10:00:00+00:00');
      expect(result.data[0].path).toBe('server/src/auth.js');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 20);
    });

    it('should only include the most recent touch per file', () => {
      const result = buildRecentFiles(commits);

      // README.md appears in two commits; should only appear once
      const readmeEntries = result.data.filter(
        (f) => f.path === 'README.md',
      );
      expect(readmeEntries).toHaveLength(1);
      // Should be the most recent (ghi789 at 2025-06-05, not jkl012 at 2025-05-28)
      expect(readmeEntries[0].date).toBe('2025-06-05T09:15:00+00:00');
    });

    it('should respect the pageSize parameter', () => {
      const result = buildRecentFiles(commits, null, { page: 1, pageSize: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should paginate correctly', () => {
      const page1 = buildRecentFiles(commits, null, {
        page: 1,
        pageSize: 2,
      });
      const page2 = buildRecentFiles(commits, null, {
        page: 2,
        pageSize: 2,
      });
      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);
      // Pages should not overlap
      const page1Paths = page1.data.map((f) => f.path);
      const page2Paths = page2.data.map((f) => f.path);
      page2Paths.forEach((p) => {
        expect(page1Paths).not.toContain(p);
      });
    });

    it('should filter by author', () => {
      const result = buildRecentFiles(commits, 'bob@example.com');

      result.data.forEach((f) => {
        expect(f.authorEmail).toBe('bob@example.com');
      });
    });

    it('should return empty data for empty commits', () => {
      const result = buildRecentFiles([]);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // setRepoRoot / getRepoRoot
  // ────────────────────────────────────────────────────────────────────────
  describe('setRepoRoot / getRepoRoot', () => {
    it('should update and retrieve the repo root', () => {
      setRepoRoot('/tmp/my-repo');
      expect(getRepoRoot()).toBe('/tmp/my-repo');
    });

    it('should allow setting to null', () => {
      setRepoRoot(null);
      expect(getRepoRoot()).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // listFolders
  // ────────────────────────────────────────────────────────────────────────
  describe('listFolders', () => {
    it('should parse git ls-tree output into sorted folder names', () => {
      mockExecSync.mockReturnValue('client\nserver\nbin');

      const folders = listFolders('');
      expect(folders).toEqual(['bin', 'client', 'server']);
    });

    it('should pass the folder path to git ls-tree', () => {
      mockExecSync.mockReturnValue('routes\ngit');

      const folders = listFolders('server/src');
      expect(folders).toEqual(['git', 'routes']);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('HEAD:server/src'),
        expect.any(Object),
      );
    });

    it('should return empty array on error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a tree object');
      });

      const folders = listFolders('nonexistent');
      expect(folders).toEqual([]);
    });

    it('should return empty array for empty output', () => {
      mockExecSync.mockReturnValue('');

      const folders = listFolders('');
      expect(folders).toEqual([]);
    });
  });
});
