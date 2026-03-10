import React, { useState, useCallback } from 'react';
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

export default function App() {
  const [branch, setBranch] = useState(null);
  const [folder, setFolder] = useState(null);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Data fetches ---
  const branchUrl = '/api/branches';
  const authorsUrl = buildUrl('/api/authors', {
    branch,
    folder,
    since: dateFrom,
    until: dateTo,
  });
  const heatmapUrl = buildUrl('/api/activity/heatmap', {
    branch,
    folder,
    author: selectedAuthors.length > 0 ? selectedAuthors : null,
    since: dateFrom,
    until: dateTo,
  });
  const timelineUrl = buildUrl('/api/activity/timeline', {
    branch,
    folder,
    since: dateFrom,
    until: dateTo,
  });
  const authorParam = selectedAuthors.length > 0 ? selectedAuthors : null;
  const byDayUrl = buildUrl('/api/activity/by-day', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const byHourUrl = buildUrl('/api/activity/by-hour', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const fileTypesUrl = buildUrl('/api/activity/file-types', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const topFilesUrl = buildUrl('/api/activity/top-files', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
  });
  const recentFilesUrl = buildUrl('/api/activity/recent-files', {
    branch,
    folder,
    author: authorParam,
    since: dateFrom,
    until: dateTo,
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

  return (
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
          <TopFiles data={topFiles.data} />
        </Box>
      )}

      {/* Recent files */}
      {recentFiles.data && (
        <Box sx={{ mt: 2 }}>
          <RecentFiles data={recentFiles.data} />
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 4, mt: 4 }}>
        <Typography level="body-xs" sx={{ color: 'neutral.600' }}>
          Who Made What — Repository Contribution Report
        </Typography>
      </Box>
    </Layout>
  );
}
