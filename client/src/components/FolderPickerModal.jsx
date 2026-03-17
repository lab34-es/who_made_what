import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import Typography from '@mui/joy/Typography';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Input from '@mui/joy/Input';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import ListItemContent from '@mui/joy/ListItemContent';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import IconButton from '@mui/joy/IconButton';
import Tooltip from '@mui/joy/Tooltip';
import Divider from '@mui/joy/Divider';
import Sheet from '@mui/joy/Sheet';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HomeIcon from '@mui/icons-material/Home';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SearchIcon from '@mui/icons-material/Search';

/**
 * FolderPickerModal — OS filesystem explorer for selecting a git repository.
 *
 * Props:
 *   open     - Whether the modal is visible.
 *   onSelect - Callback invoked with the repo selection response from the server
 *              when the user successfully selects a git repository.
 */
export default function FolderPickerModal({ open, onSelect }) {
  const [currentPath, setCurrentPath] = useState(null);
  const [entries, setEntries] = useState([]);
  const [parentPath, setParentPath] = useState(null);
  const [homedir, setHomedir] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState(null);
  const [pathInput, setPathInput] = useState('');

  /**
   * Fetch the directory listing from the server.
   */
  const fetchEntries = useCallback(async (dirPath) => {
    setLoading(true);
    setError(null);
    setSelectError(null);

    try {
      const url = dirPath
        ? `/api/fs/list?path=${encodeURIComponent(dirPath)}`
        : '/api/fs/list';

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setCurrentPath(data.path);
      setEntries(data.entries || []);
      setParentPath(data.parent);
      setHomedir(data.homedir);
      setPathInput(data.path || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load root listing on mount
  useEffect(() => {
    if (open) {
      fetchEntries(null);
    }
  }, [open, fetchEntries]);

  /**
   * Navigate into a directory.
   */
  const handleNavigate = (dirPath) => {
    fetchEntries(dirPath);
  };

  /**
   * Navigate up to parent.
   */
  const handleGoUp = () => {
    if (parentPath) {
      fetchEntries(parentPath);
    } else {
      // Go back to system roots
      fetchEntries(null);
    }
  };

  /**
   * Navigate to home directory.
   */
  const handleGoHome = () => {
    if (homedir) {
      fetchEntries(homedir);
    }
  };

  /**
   * Navigate to a manually typed path.
   */
  const handlePathSubmit = (e) => {
    e.preventDefault();
    if (pathInput.trim()) {
      fetchEntries(pathInput.trim());
    }
  };

  /**
   * Select the current directory as the repository.
   */
  const handleSelectFolder = async () => {
    if (!currentPath) return;

    setSelecting(true);
    setSelectError(null);

    try {
      const res = await fetch('/api/repo/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Success — notify parent
      onSelect(data);
    } catch (err) {
      setSelectError(err.message);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <Modal open={open}>
      <ModalDialog
        variant="outlined"
        sx={{
          width: '90vw',
          maxWidth: 640,
          height: '80vh',
          maxHeight: 700,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          p: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Typography level="h4" sx={{ fontWeight: 600 }}>
            Select a Git Repository
          </Typography>
          <Typography level="body-sm" sx={{ color: 'neutral.400', mt: 0.5 }}>
            Browse your filesystem and select a folder containing a git
            repository.
          </Typography>
        </Box>

        <Divider />

        {/* Path bar + navigation */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.5,
          }}
        >
          <Tooltip title="Go to parent folder">
            <span>
              <IconButton
                variant="outlined"
                color="neutral"
                size="sm"
                disabled={!currentPath}
                onClick={handleGoUp}
              >
                <ArrowUpwardIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Go to home folder">
            <IconButton
              variant="outlined"
              color="neutral"
              size="sm"
              onClick={handleGoHome}
              disabled={!homedir}
            >
              <HomeIcon />
            </IconButton>
          </Tooltip>

          <Box
            component="form"
            onSubmit={handlePathSubmit}
            sx={{ flex: 1, display: 'flex', gap: 1 }}
          >
            <Input
              size="sm"
              placeholder="Type a path..."
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              sx={{
                flex: 1,
                fontFamily: 'code',
                fontSize: '0.8rem',
              }}
              endDecorator={
                <IconButton
                  variant="plain"
                  size="sm"
                  type="submit"
                  color="neutral"
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              }
            />
          </Box>
        </Box>

        <Divider />

        {/* Error messages */}
        {error && (
          <Alert color="danger" variant="soft" sx={{ mx: 2, mt: 1, mb: 0 }}>
            {error}
          </Alert>
        )}
        {selectError && (
          <Alert color="warning" variant="soft" sx={{ mx: 2, mt: 1, mb: 0 }}>
            {selectError}
          </Alert>
        )}

        {/* Directory listing */}
        <Sheet
          variant="outlined"
          sx={{
            flex: 1,
            mx: 2,
            mt: 1.5,
            mb: 0,
            borderRadius: 'sm',
            overflow: 'auto',
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                py: 6,
              }}
            >
              <CircularProgress size="md" />
            </Box>
          ) : entries.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                py: 6,
              }}
            >
              <Typography level="body-sm" sx={{ color: 'neutral.400' }}>
                {currentPath ? 'No subdirectories found' : 'No drives found'}
              </Typography>
            </Box>
          ) : (
            <List size="sm" sx={{ '--ListItem-paddingY': '2px' }}>
              {entries.map((entry) => (
                <ListItem key={entry.path}>
                  <ListItemButton
                    onClick={() => handleNavigate(entry.path)}
                    sx={{ borderRadius: 'sm' }}
                  >
                    <ListItemDecorator>
                      <FolderIcon
                        sx={{ color: 'primary.400', fontSize: '1.2rem' }}
                      />
                    </ListItemDecorator>
                    <ListItemContent>
                      <Typography
                        level="body-sm"
                        sx={{ fontFamily: 'code', fontSize: '0.8rem' }}
                      >
                        {entry.name}
                      </Typography>
                    </ListItemContent>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Sheet>

        {/* Footer: current selection + select button */}
        <Divider sx={{ mt: 1.5 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 2,
          }}
        >
          <FolderOpenIcon sx={{ color: 'neutral.400', flexShrink: 0 }} />
          <Typography
            level="body-sm"
            sx={{
              flex: 1,
              fontFamily: 'code',
              fontSize: '0.8rem',
              color: currentPath ? 'text.primary' : 'neutral.500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentPath || 'Select a folder...'}
          </Typography>
          <Button
            variant="solid"
            color="primary"
            size="sm"
            disabled={!currentPath || selecting}
            loading={selecting}
            onClick={handleSelectFolder}
          >
            {selecting ? 'Scanning...' : 'Select this folder'}
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
