import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Chip from '@mui/joy/Chip';
import PersonIcon from '@mui/icons-material/Person';

import { useApi, buildUrl } from './hooks/useApi';
import Layout from './components/Layout';
import AuthorList from './components/AuthorList';
import HeatmapChart from './components/HeatmapChart';
import TimelineChart from './components/TimelineChart';
import ActivityByDay from './components/ActivityByDay';
import ActivityByHour from './components/ActivityByHour';
import TopFiles from './components/TopFiles';
import RecentFiles from './components/RecentFiles';
import FolderPickerModal from './components/FolderPickerModal';

export default function App() {
  // --- Repository selection state ---
  const [repoReady, setRepoReady] = useState(false);
  const [repoPath, setRepoPath] = useState(null);
  const [repoChecking, setRepoChecking] = useState(true);

  // Check if a repo is already selected on mount (e.g. env var was set)
  useEffect(() => {
    fetch('/api/repo/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.ready) {
          setRepoReady(true);
          setRepoPath(data.path);
        }
      })
      .catch(() => {
        // Server not reachable — modal will show
      })
      .finally(() => setRepoChecking(false));
  }, []);

  // Called when the user selects a repo from the folder picker
  const handleRepoSelect = useCallback((data) => {
    setRepoReady(true);
    setRepoPath(data.path);
  }, []);

  // --- Filter state ---
  const [branch, setBranch] = useState(null);
  const [folder, setFolder] = useState(null);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentFilesPage, setRecentFilesPage] = useState(1);
  const [recentFilesPageSize, setRecentFilesPageSize] = useState(20);
  const [topFilesPage, setTopFilesPage] = useState(1);
  const [topFilesPageSize, setTopFilesPageSize] = useState(20);

  // Reset pagination when filters change
  useEffect(() => {
    setRecentFilesPage(1);
    setTopFilesPage(1);
  }, [branch, folder, selectedAuthors, dateFrom, dateTo]);

  // --- Data fetches (gated by repoReady) ---
  const branchUrl = repoReady ? '/api/branches' : null;
  const authorsUrl = !repoReady ? null : buildUrl('/api/authors', {
    branch,
    folder,
    since: dateFrom,
    until: dateTo,
  });
  const authorParam = selectedAuthors.length > 0 ? selectedAuthors : null;
  const heatmapUrl = !repoReady ? null : buildUrl('/api/activity/heatmap', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const timelineUrl = !repoReady ? null : buildUrl('/api/activity/timeline', {
    branch,
    folder,
    since: dateFrom,
    until: dateTo,
  });
  const byDayUrl = !repoReady ? null : buildUrl('/api/activity/by-day', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const byHourUrl = !repoReady ? null : buildUrl('/api/activity/by-hour', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const fileTypesUrl = !repoReady ? null : buildUrl('/api/activity/file-types', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const topFilesUrl = !repoReady ? null : buildUrl('/api/activity/top-files', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
    page: topFilesPage,
    pageSize: topFilesPageSize,
  });
  const recentFilesUrl = !repoReady ? null : buildUrl('/api/activity/recent-files', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
    page: recentFilesPage,
    pageSize: recentFilesPageSize,
  });

  const branches = useApi(branchUrl);
  const authors = useApi(authorsUrl);
  const heatmap = useApi(heatmapUrl);
  const timeline = useApi(timelineUrl);
  const byDay = useApi(byDayUrl);
  const byHour = useApi(byHourUrl);
  const fileTypes = useApi(fileTypesUrl);
  const topFiles = useApi(topFilesUrl);
  const recentFiles = useApi(recentFilesUrl);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch('/api/refresh', { method: 'POST' });
      // Refetch all data
      branches.refetch();
      authors.refetch();
      heatmap.refetch();
      timeline.refetch();
      byDay.refetch();
      byHour.refetch();
      fileTypes.refetch();
      topFiles.refetch();
      recentFiles.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [
    branches,
    authors,
    heatmap,
    timeline,
    byDay,
    byHour,
    fileTypes,
    topFiles,
    recentFiles,
  ]);

  const loading = authors.loading || heatmap.loading;
  const error = authors.error || branches.error;

  // Find selected authors data for display
  const selectedAuthorsData =
    selectedAuthors.length > 0 && authors.data
      ? authors.data.filter((a) => selectedAuthors.includes(a.email))
      : [];

  // Toggle an author in the selection
  const handleAuthorToggle = (email) => {
    setSelectedAuthors((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  };

  // Build the sidebar content
  const sidebarContent = authors.data ? (
    <Box>
      <Typography level="title-lg" sx={{ color: 'text.primary', mb: 0.5 }}>
        Contributors
      </Typography>
      <Typography level="body-xs" sx={{ color: 'neutral.400', mb: 1.5 }}>
        {authors.data.length} developer
        {authors.data.length !== 1 ? 's' : ''} &middot;{' '}
        {authors.data.reduce((s, a) => s + a.commits, 0).toLocaleString()}{' '}
        commits
      </Typography>

      {/* Selected authors indicators */}
      {selectedAuthorsData.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          {selectedAuthorsData.map((a) => (
            <Chip
              key={a.email}
              size="sm"
              variant="soft"
              color="primary"
              startDecorator={<PersonIcon />}
              onDelete={() => handleAuthorToggle(a.email)}
            >
              {a.name}
            </Chip>
          ))}
          {selectedAuthorsData.length > 1 && (
            <Chip
              size="sm"
              variant="outlined"
              color="neutral"
              sx={{ cursor: 'pointer' }}
              onClick={() => setSelectedAuthors([])}
            >
              Clear all
            </Chip>
          )}
        </Box>
      )}

      <AuthorList
        authors={authors.data}
        selectedAuthors={selectedAuthors}
        onSelect={handleAuthorToggle}
      />
    </Box>
  ) : null;

  // Show a loading spinner while checking repo status on mount
  if (repoChecking) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.body',
        }}
      >
        <CircularProgress size="lg" />
      </Box>
    );
  }

  return (
    <>
      {/* Folder picker modal — shown until a repo is selected */}
      <FolderPickerModal open={!repoReady} onSelect={handleRepoSelect} />

      <Layout
        branches={branches.data?.branches || []}
        selectedBranch={branch}
        onBranchChange={setBranch}
        currentFolder={folder}
        onFolderChange={setFolder}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        sidebar={sidebarContent}
      >
        {error && (
          <Alert color="danger" sx={{ mb: 2 }}>
            Failed to load data: {error}. Is the server running on port 3001?
          </Alert>
        )}

        {loading && !authors.data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size="lg" />
          </Box>
        )}

        {/* Heatmap */}
        {heatmap.data && <HeatmapChart data={heatmap.data} />}

        {/* Charts grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            mt: 2,
          }}
        >
          {timeline.data && <TimelineChart data={timeline.data} />}
          {byDay.data && <ActivityByDay data={byDay.data} />}
          {byHour.data && <ActivityByHour data={byHour.data} />}
        </Box>

        {/* Top files */}
        {topFiles.data && (
          <Box sx={{ mt: 2 }}>
            <TopFiles
              data={topFiles.data.data}
              total={topFiles.data.total}
              page={topFiles.data.page}
              pageSize={topFiles.data.pageSize}
              onPageChange={setTopFilesPage}
              onPageSizeChange={(size) => {
                setTopFilesPageSize(size);
                setTopFilesPage(1);
              }}
            />
          </Box>
        )}

        {/* Recent files */}
        {recentFiles.data && (
          <Box sx={{ mt: 2 }}>
            <RecentFiles
              data={recentFiles.data.data}
              total={recentFiles.data.total}
              page={recentFiles.data.page}
              pageSize={recentFiles.data.pageSize}
              onPageChange={setRecentFilesPage}
              onPageSizeChange={(size) => {
                setRecentFilesPageSize(size);
                setRecentFilesPage(1);
              }}
            />
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', py: 4, mt: 4 }}>
          <Typography level="body-xs" sx={{ color: 'neutral.600' }}>
            Who Made What — Repository Contribution Report
          </Typography>
        </Box>
      </Layout>
    </>
  );
}
