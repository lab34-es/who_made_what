import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import Tooltip from '@mui/joy/Tooltip';
import { useColorScheme } from '@mui/joy/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import BranchFilter from './BranchFilter';
import FolderBreadcrumb from './FolderBreadcrumb';
import DateFilter from './DateFilter';

export default function Layout({
  branches,
  selectedBranch,
  onBranchChange,
  currentFolder,
  onFolderChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onRefresh,
  refreshing,
  sidebar,
  children,
}) {
  const { mode, setMode } = useColorScheme();

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.body' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 1.5,
          bgcolor: 'background.surface',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography
          level="h4"
          sx={{ fontWeight: 600, color: 'text.primary', flexShrink: 0 }}
        >
          Who Made What
        </Typography>

        <FolderBreadcrumb
          currentFolder={currentFolder}
          onFolderChange={onFolderChange}
        />

        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
        />

        <Box sx={{ flex: 1 }} />

        <BranchFilter
          branches={branches}
          value={selectedBranch}
          onChange={onBranchChange}
        />

        <Tooltip
          title={
            mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          }
        >
          <IconButton
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={toggleMode}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Refresh data">
          <IconButton
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={onRefresh}
            loading={refreshing}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Body: sidebar + main content */}
      <Box
        sx={{
          display: 'flex',
          gap: 0,
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        {/* Sidebar */}
        {sidebar && (
          <Box
            component="aside"
            sx={{
              width: 300,
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              overflowY: 'auto',
              position: 'sticky',
              top: 56,
              height: 'calc(100vh - 56px)',
              p: 2,
              display: { xs: 'none', md: 'block' },
            }}
          >
            {sidebar}
          </Box>
        )}

        {/* Main content */}
        <Box component="main" sx={{ flex: 1, minWidth: 0, p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
