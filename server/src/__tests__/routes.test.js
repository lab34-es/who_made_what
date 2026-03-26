import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ─── Mock the cache module ──────────────────────────────────────────────────
const mockCache = {
  branches: ['main', 'develop'],
  scannedAt: '2025-06-10T12:00:00.000Z',
  repoReady: true,
  scan: jest.fn(),
  reset: jest.fn(),
  getAuthors: jest.fn(),
  getHeatmap: jest.fn(),
  getTimeline: jest.fn(),
  getByDay: jest.fn(),
  getByHour: jest.fn(),
  getTopFiles: jest.fn(),
  getRecentFiles: jest.fn(),
  getFolders: jest.fn(),
};

jest.unstable_mockModule('../git/cache.js', () => ({
  default: mockCache,
}));

// Import route modules after mock setup
const { default: branchesRouter } = await import('../routes/branches.js');
const { default: authorsRouter } = await import('../routes/authors.js');
const { default: activityRouter } = await import('../routes/activity.js');
const { default: foldersRouter } = await import('../routes/folders.js');
const { default: refreshRouter } = await import('../routes/refresh.js');

// ─── Helper: fake Express req/res ───────────────────────────────────────────
function createReq(query = {}) {
  return { query };
}

function createRes() {
  const res = {
    _json: null,
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

/**
 * Find a route handler on an Express Router.
 * Express routers store layers in router.stack. Each layer has a route
 * with a path and methods.
 */
function findHandler(router, method, path) {
  for (const layer of router.stack) {
    if (
      layer.route &&
      layer.route.path === path &&
      layer.route.methods[method]
    ) {
      return layer.route.stack[0].handle;
    }
  }
  throw new Error(`No ${method.toUpperCase()} ${path} handler found`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /api/branches
  // ──────────────────────────────────────────────────────────────────────
  describe('GET /api/branches', () => {
    it('should return branches and scannedAt', () => {
      const handler = findHandler(branchesRouter, 'get', '/');
      const req = createReq();
      const res = createRes();

      handler(req, res);

      expect(res._json).toEqual({
        branches: ['main', 'develop'],
        scannedAt: '2025-06-10T12:00:00.000Z',
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /api/authors
  // ──────────────────────────────────────────────────────────────────────
  describe('GET /api/authors', () => {
    it('should call cache.getAuthors with query params', () => {
      const handler = findHandler(authorsRouter, 'get', '/');
      const mockAuthors = [{ name: 'Alice', commits: 5 }];
      mockCache.getAuthors.mockReturnValue(mockAuthors);

      const req = createReq({
        branch: 'main',
        folder: 'server',
        since: '2025-01-01',
        until: '2025-12-31',
      });
      const res = createRes();

      handler(req, res);

      expect(mockCache.getAuthors).toHaveBeenCalledWith(
        'main',
        'server',
        '2025-01-01',
        '2025-12-31',
      );
      expect(res._json).toBe(mockAuthors);
    });

    it('should pass null for missing query params', () => {
      const handler = findHandler(authorsRouter, 'get', '/');
      mockCache.getAuthors.mockReturnValue([]);

      const req = createReq({});
      const res = createRes();

      handler(req, res);

      expect(mockCache.getAuthors).toHaveBeenCalledWith(null, null, null, null);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Activity routes
  // ──────────────────────────────────────────────────────────────────────
  describe('activity routes', () => {
    describe('GET /heatmap', () => {
      it('should call cache.getHeatmap with parsed params', () => {
        const handler = findHandler(activityRouter, 'get', '/heatmap');
        const mockData = { '2025-06-10': 3 };
        mockCache.getHeatmap.mockReturnValue(mockData);

        const req = createReq({
          branch: 'main',
          author: 'alice@example.com',
          folder: 'server',
          since: '2025-01-01',
          until: '2025-12-31',
        });
        const res = createRes();

        handler(req, res);

        expect(mockCache.getHeatmap).toHaveBeenCalledWith(
          'main',
          'alice@example.com',
          'server',
          '2025-01-01',
          '2025-12-31',
        );
        expect(res._json).toBe(mockData);
      });

      it('should parse comma-separated authors', () => {
        const handler = findHandler(activityRouter, 'get', '/heatmap');
        mockCache.getHeatmap.mockReturnValue({});

        const req = createReq({
          author: 'alice@example.com,bob@example.com',
        });
        const res = createRes();

        handler(req, res);

        expect(mockCache.getHeatmap).toHaveBeenCalledWith(
          null,
          ['alice@example.com', 'bob@example.com'],
          null,
          null,
          null,
        );
      });
    });

    describe('GET /timeline', () => {
      it('should call cache.getTimeline', () => {
        const handler = findHandler(activityRouter, 'get', '/timeline');
        const mockData = [{ week: '2025-06-09', total: 5 }];
        mockCache.getTimeline.mockReturnValue(mockData);

        const req = createReq({ branch: 'develop', author: 'alice@example.com' });
        const res = createRes();

        handler(req, res);

        expect(mockCache.getTimeline).toHaveBeenCalledWith(
          'develop',
          'alice@example.com',
          null,
          null,
          null,
        );
        expect(res._json).toBe(mockData);
      });
    });

    describe('GET /by-day', () => {
      it('should call cache.getByDay', () => {
        const handler = findHandler(activityRouter, 'get', '/by-day');
        const mockData = [{ day: 'Mon', commits: 3 }];
        mockCache.getByDay.mockReturnValue(mockData);

        const req = createReq({ author: 'alice@example.com' });
        const res = createRes();

        handler(req, res);

        expect(mockCache.getByDay).toHaveBeenCalledWith(
          null,
          'alice@example.com',
          null,
          null,
          null,
        );
        expect(res._json).toBe(mockData);
      });
    });

    describe('GET /by-hour', () => {
      it('should call cache.getByHour', () => {
        const handler = findHandler(activityRouter, 'get', '/by-hour');
        const mockData = [{ hour: '10:00', commits: 2 }];
        mockCache.getByHour.mockReturnValue(mockData);

        const req = createReq({});
        const res = createRes();

        handler(req, res);

        expect(mockCache.getByHour).toHaveBeenCalledWith(
          null,
          null,
          null,
          null,
          null,
        );
        expect(res._json).toBe(mockData);
      });
    });

    describe('GET /top-files', () => {
      it('should call cache.getTopFiles with default pagination', () => {
        const handler = findHandler(activityRouter, 'get', '/top-files');
        const mockData = { data: [{ path: 'a.js', commits: 5 }], total: 1, page: 1, pageSize: 20 };
        mockCache.getTopFiles.mockReturnValue(mockData);

        const req = createReq({});
        const res = createRes();

        handler(req, res);

        expect(mockCache.getTopFiles).toHaveBeenCalledWith(
          null,
          null,
          { page: 1, pageSize: 20 },
          null,
          null,
          null,
        );
      });

      it('should parse custom page and pageSize', () => {
        const handler = findHandler(activityRouter, 'get', '/top-files');
        mockCache.getTopFiles.mockReturnValue({ data: [], total: 0, page: 3, pageSize: 50 });

        const req = createReq({ page: '3', pageSize: '50' });
        const res = createRes();

        handler(req, res);

        expect(mockCache.getTopFiles).toHaveBeenCalledWith(
          null,
          null,
          { page: 3, pageSize: 50 },
          null,
          null,
          null,
        );
      });
    });

    describe('GET /recent-files', () => {
      it('should call cache.getRecentFiles with default pagination', () => {
        const handler = findHandler(activityRouter, 'get', '/recent-files');
        const mockData = {
          data: [{ path: 'a.js', date: '2025-06-10' }],
          total: 1,
          page: 1,
          pageSize: 20,
        };
        mockCache.getRecentFiles.mockReturnValue(mockData);

        const req = createReq({});
        const res = createRes();

        handler(req, res);

        expect(mockCache.getRecentFiles).toHaveBeenCalledWith(
          null,
          null,
          { page: 1, pageSize: 20 },
          null,
          null,
          null,
        );
      });

      it('should parse custom page and pageSize', () => {
        const handler = findHandler(activityRouter, 'get', '/recent-files');
        mockCache.getRecentFiles.mockReturnValue({
          data: [],
          total: 0,
          page: 2,
          pageSize: 50,
        });

        const req = createReq({ page: '2', pageSize: '50' });
        const res = createRes();

        handler(req, res);

        expect(mockCache.getRecentFiles).toHaveBeenCalledWith(
          null,
          null,
          { page: 2, pageSize: 50 },
          null,
          null,
          null,
        );
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // GET /api/folders
  // ──────────────────────────────────────────────────────────────────────
  describe('GET /api/folders', () => {
    it('should call cache.getFolders with path query param', () => {
      const handler = findHandler(foldersRouter, 'get', '/');
      const mockFolders = ['bin', 'client', 'server'];
      mockCache.getFolders.mockReturnValue(mockFolders);

      const req = createReq({ path: 'server/src' });
      const res = createRes();

      handler(req, res);

      expect(mockCache.getFolders).toHaveBeenCalledWith('server/src');
      expect(res._json).toEqual({ folders: mockFolders });
    });

    it('should default to empty string when path is not provided', () => {
      const handler = findHandler(foldersRouter, 'get', '/');
      mockCache.getFolders.mockReturnValue([]);

      const req = createReq({});
      const res = createRes();

      handler(req, res);

      expect(mockCache.getFolders).toHaveBeenCalledWith('');
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // POST /api/refresh
  // ──────────────────────────────────────────────────────────────────────
  describe('POST /api/refresh', () => {
    it('should trigger a cache scan and return status', async () => {
      const handler = findHandler(refreshRouter, 'post', '/');
      mockCache.scan.mockResolvedValue(undefined);
      mockCache.scannedAt = '2025-06-10T12:00:00.000Z';
      mockCache.branches = ['main', 'develop', 'feature/x'];

      const req = createReq();
      const res = createRes();

      await handler(req, res);

      expect(mockCache.scan).toHaveBeenCalledTimes(1);
      expect(res._json).toEqual({
        scannedAt: '2025-06-10T12:00:00.000Z',
        branches: 3,
      });
    });
  });
});
