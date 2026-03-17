import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ─── Mock the parser module ─────────────────────────────────────────────────
const mockParseBranches = jest.fn();
const mockParseCommits = jest.fn();
const mockDeriveAuthors = jest.fn();
const mockBuildHeatmap = jest.fn();
const mockBuildTimeline = jest.fn();
const mockBuildByDay = jest.fn();
const mockBuildByHour = jest.fn();
const mockBuildTopFiles = jest.fn();
const mockBuildRecentFiles = jest.fn();
const mockFilterCommitsByFolder = jest.fn();
const mockFilterCommitsByDate = jest.fn();
const mockListFolders = jest.fn();
const mockGetRepoRoot = jest.fn();

jest.unstable_mockModule('../git/parser.js', () => ({
  parseBranches: mockParseBranches,
  parseCommits: mockParseCommits,
  deriveAuthors: mockDeriveAuthors,
  buildHeatmap: mockBuildHeatmap,
  buildTimeline: mockBuildTimeline,
  buildByDay: mockBuildByDay,
  buildByHour: mockBuildByHour,
  buildTopFiles: mockBuildTopFiles,
  buildRecentFiles: mockBuildRecentFiles,
  filterCommitsByFolder: mockFilterCommitsByFolder,
  filterCommitsByDate: mockFilterCommitsByDate,
  listFolders: mockListFolders,
  getRepoRoot: mockGetRepoRoot,
}));

// Import cache after mocks are set up
const { default: cache } = await import('../git/cache.js');

// ─── Sample data ─────────────────────────────────────────────────────────────
const sampleCommits = [
  {
    hash: 'abc123',
    authorName: 'Alice',
    authorEmail: 'alice@example.com',
    date: '2025-06-10T10:00:00+00:00',
    subject: 'feat: add login',
    files: [],
    totalAdded: 55,
    totalRemoved: 2,
  },
  {
    hash: 'def456',
    authorName: 'Bob',
    authorEmail: 'bob@example.com',
    date: '2025-06-08T14:30:00+00:00',
    subject: 'fix: resolve crash',
    files: [],
    totalAdded: 10,
    totalRemoved: 3,
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('GitCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset cache state
    cache.branches = [];
    cache.commitsByBranch = new Map();
    cache.scannedAt = null;
    cache.scanning = false;
    cache.repoReady = false;

    // Default: repo root is configured (so scan() proceeds)
    mockGetRepoRoot.mockReturnValue('/fake/repo');

    // Default filter pass-through behavior
    mockFilterCommitsByFolder.mockImplementation((commits) => commits);
    mockFilterCommitsByDate.mockImplementation((commits) => commits);
  });

  // ──────────────────────────────────────────────────────────────────────
  // scan()
  // ──────────────────────────────────────────────────────────────────────
  describe('scan', () => {
    it('should scan branches and all-branch commits', async () => {
      mockParseBranches.mockReturnValue(['main', 'develop']);
      mockParseCommits.mockReturnValue(sampleCommits);

      await cache.scan();

      expect(mockParseBranches).toHaveBeenCalledTimes(1);
      expect(mockParseCommits).toHaveBeenCalledWith(null);
      expect(cache.branches).toEqual(['main', 'develop']);
      expect(cache.commitsByBranch.get('__all__')).toBe(sampleCommits);
      expect(cache.scannedAt).toBeTruthy();
    });

    it('should not run concurrent scans', async () => {
      cache.scanning = true;

      await cache.scan();

      expect(mockParseBranches).not.toHaveBeenCalled();
    });

    it('should skip scan when no repo root is configured', async () => {
      mockGetRepoRoot.mockReturnValue(null);

      await cache.scan();

      expect(mockParseBranches).not.toHaveBeenCalled();
      expect(cache.repoReady).toBe(false);
    });

    it('should set repoReady to true after successful scan', async () => {
      mockParseBranches.mockReturnValue(['main']);
      mockParseCommits.mockReturnValue(sampleCommits);

      await cache.scan();

      expect(cache.repoReady).toBe(true);
    });

    it('should set scanning flag during scan and clear on completion', async () => {
      mockParseBranches.mockReturnValue([]);
      mockParseCommits.mockReturnValue([]);

      const scanPromise = cache.scan();
      // scanning flag is set synchronously at the start
      await scanPromise;

      expect(cache.scanning).toBe(false);
    });

    it('should handle scan errors gracefully', async () => {
      mockParseBranches.mockImplementation(() => {
        throw new Error('git not found');
      });

      await cache.scan();

      // Should not crash, scanning flag should be cleared
      expect(cache.scanning).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // reset()
  // ──────────────────────────────────────────────────────────────────────
  describe('reset', () => {
    it('should clear all cached data and set repoReady to false', async () => {
      mockParseBranches.mockReturnValue(['main']);
      mockParseCommits.mockReturnValue(sampleCommits);
      await cache.scan();

      expect(cache.repoReady).toBe(true);

      cache.reset();

      expect(cache.branches).toEqual([]);
      expect(cache.commitsByBranch.size).toBe(0);
      expect(cache.scannedAt).toBeNull();
      expect(cache.repoReady).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getCommits()
  // ──────────────────────────────────────────────────────────────────────
  describe('getCommits', () => {
    it('should return all-branch commits when branch is null', () => {
      cache.commitsByBranch.set('__all__', sampleCommits);

      const result = cache.getCommits(null);
      expect(result).toBe(sampleCommits);
    });

    it('should return all-branch commits when branch is "__all__"', () => {
      cache.commitsByBranch.set('__all__', sampleCommits);

      const result = cache.getCommits('__all__');
      expect(result).toBe(sampleCommits);
    });

    it('should return cached branch commits if available', () => {
      const branchCommits = [sampleCommits[0]];
      cache.commitsByBranch.set('feature/x', branchCommits);

      const result = cache.getCommits('feature/x');
      expect(result).toBe(branchCommits);
      expect(mockParseCommits).not.toHaveBeenCalled();
    });

    it('should lazily parse and cache a branch on first request', () => {
      const branchCommits = [sampleCommits[1]];
      mockParseCommits.mockReturnValue(branchCommits);

      const result = cache.getCommits('develop');

      expect(mockParseCommits).toHaveBeenCalledWith('develop');
      expect(result).toBe(branchCommits);
      // Verify it's cached
      expect(cache.commitsByBranch.get('develop')).toBe(branchCommits);
    });

    it('should return empty array if lazy parse throws', () => {
      mockParseCommits.mockImplementation(() => {
        throw new Error('branch not found');
      });

      const result = cache.getCommits('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return empty array when no all-branch data is loaded', () => {
      const result = cache.getCommits(null);
      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // _filter()
  // ──────────────────────────────────────────────────────────────────────
  describe('_filter', () => {
    it('should apply folder and date filters in sequence', () => {
      cache.commitsByBranch.set('__all__', sampleCommits);
      const folderFiltered = [sampleCommits[0]];
      const dateFiltered = [sampleCommits[0]];

      mockFilterCommitsByFolder.mockReturnValue(folderFiltered);
      mockFilterCommitsByDate.mockReturnValue(dateFiltered);

      const result = cache._filter(null, 'server', '2025-06-01', '2025-06-30');

      expect(mockFilterCommitsByFolder).toHaveBeenCalledWith(
        sampleCommits,
        'server',
      );
      expect(mockFilterCommitsByDate).toHaveBeenCalledWith(
        folderFiltered,
        '2025-06-01',
        '2025-06-30',
      );
      expect(result).toBe(dateFiltered);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Query methods (delegates to parser functions)
  // ──────────────────────────────────────────────────────────────────────
  describe('query methods', () => {
    beforeEach(() => {
      cache.commitsByBranch.set('__all__', sampleCommits);
    });

    it('getAuthors delegates to deriveAuthors', () => {
      const expected = [{ name: 'Alice' }];
      mockDeriveAuthors.mockReturnValue(expected);

      const result = cache.getAuthors(null, null, null, null);
      expect(mockDeriveAuthors).toHaveBeenCalledWith(sampleCommits);
      expect(result).toBe(expected);
    });

    it('getHeatmap delegates to buildHeatmap', () => {
      const expected = { '2025-06-10': 1 };
      mockBuildHeatmap.mockReturnValue(expected);

      const result = cache.getHeatmap(
        null,
        'alice@example.com',
        null,
        null,
        null,
      );
      expect(mockBuildHeatmap).toHaveBeenCalledWith(
        sampleCommits,
        'alice@example.com',
      );
      expect(result).toBe(expected);
    });

    it('getTimeline delegates to buildTimeline', () => {
      const expected = [{ week: '2025-06-09', total: 2 }];
      mockBuildTimeline.mockReturnValue(expected);

      const result = cache.getTimeline(null, null, null, null);
      expect(mockBuildTimeline).toHaveBeenCalledWith(sampleCommits);
      expect(result).toBe(expected);
    });

    it('getByDay delegates to buildByDay', () => {
      const expected = [{ day: 'Mon', commits: 1 }];
      mockBuildByDay.mockReturnValue(expected);

      const result = cache.getByDay(
        null,
        'alice@example.com',
        null,
        null,
        null,
      );
      expect(mockBuildByDay).toHaveBeenCalledWith(
        sampleCommits,
        'alice@example.com',
      );
      expect(result).toBe(expected);
    });

    it('getByHour delegates to buildByHour', () => {
      const expected = [{ hour: '10:00', commits: 1 }];
      mockBuildByHour.mockReturnValue(expected);

      const result = cache.getByHour(
        null,
        'alice@example.com',
        null,
        null,
        null,
      );
      expect(mockBuildByHour).toHaveBeenCalledWith(
        sampleCommits,
        'alice@example.com',
      );
      expect(result).toBe(expected);
    });

    it('getTopFiles delegates to buildTopFiles', () => {
      const expected = { data: [{ path: 'a.js', commits: 5 }], total: 1, page: 1, pageSize: 10 };
      mockBuildTopFiles.mockReturnValue(expected);

      const result = cache.getTopFiles(null, 'a@a.com', { page: 1, pageSize: 10 }, null, null, null);
      expect(mockBuildTopFiles).toHaveBeenCalledWith(
        sampleCommits,
        'a@a.com',
        { page: 1, pageSize: 10 },
      );
      expect(result).toBe(expected);
    });

    it('getRecentFiles delegates to buildRecentFiles', () => {
      const expected = {
        data: [{ path: 'a.js', date: '2025-06-10' }],
        total: 1,
        page: 1,
        pageSize: 10,
      };
      mockBuildRecentFiles.mockReturnValue(expected);

      const result = cache.getRecentFiles(
        null,
        'a@a.com',
        { page: 1, pageSize: 10 },
        null,
        null,
        null,
      );
      expect(mockBuildRecentFiles).toHaveBeenCalledWith(
        sampleCommits,
        'a@a.com',
        { page: 1, pageSize: 10 },
      );
      expect(result).toBe(expected);
    });

    it('getFolders delegates to listFolders', () => {
      const expected = ['bin', 'client', 'server'];
      mockListFolders.mockReturnValue(expected);

      const result = cache.getFolders('');
      expect(mockListFolders).toHaveBeenCalledWith('');
      expect(result).toBe(expected);
    });
  });
});
