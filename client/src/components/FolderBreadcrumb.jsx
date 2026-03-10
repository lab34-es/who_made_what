import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import MenuButton from '@mui/joy/MenuButton';
import Dropdown from '@mui/joy/Dropdown';
import CircularProgress from '@mui/joy/CircularProgress';
import FolderIcon from '@mui/icons-material/Folder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import HomeIcon from '@mui/icons-material/Home';

/**
 * Folder breadcrumb navigator for the header.
 *
 * Shows: [root] > Parent folder > Subfolder > Current Folder v
 *
 * - Clicking a parent segment navigates up to that level.
 * - The last segment (or root) has a dropdown to pick a subfolder.
 * - When at root with no folder selected, shows a single dropdown trigger.
 */
export default function FolderBreadcrumb({ currentFolder, onFolderChange }) {
  const [subfolders, setSubfolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Parse current path into segments
  const segments = currentFolder
    ? currentFolder.split('/').filter(Boolean)
    : [];

  // Fetch subfolders when dropdown opens
  useEffect(() => {
    if (!menuOpen) return;

    let cancelled = false;
    setLoadingFolders(true);

    const params = new URLSearchParams();
    if (currentFolder) params.set('path', currentFolder);
    const url = params.toString()
      ? `/api/folders?${params.toString()}`
      : '/api/folders';

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSubfolders(data.folders || []);
      })
      .catch(() => {
        if (!cancelled) setSubfolders([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFolders(false);
      });

    return () => {
      cancelled = true;
    };
  }, [menuOpen, currentFolder]);

  // Navigate to a specific depth (clicking a parent breadcrumb segment)
  const navigateToDepth = (depth) => {
    if (depth < 0) {
      onFolderChange(null);
    } else {
      const newPath = segments.slice(0, depth + 1).join('/');
      onFolderChange(newPath);
    }
  };

  // Select a subfolder from the dropdown
  const handleSelectSubfolder = (folderName) => {
    const newPath = currentFolder
      ? `${currentFolder}/${folderName}`
      : folderName;
    onFolderChange(newPath);
    setMenuOpen(false);
  };

  // Navigate up (go to parent)
  const handleGoUp = () => {
    setMenuOpen(false);
    if (segments.length <= 1) {
      onFolderChange(null);
    } else {
      onFolderChange(segments.slice(0, -1).join('/'));
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        background: 'white',
        overflow: 'hidden',
      }}
    >
      {/* Root / home button */}
      <Box
        onClick={() => onFolderChange(null)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          px: 0.75,
          py: 0.25,
          borderRadius: 'sm',
          flexShrink: 0,
        }}
      >
        <HomeIcon sx={{ fontSize: 16 }} />
      </Box>

      {/* Breadcrumb segments for parent folders */}
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRightIcon
              sx={{ fontSize: 14, flexShrink: 0 }}
            />

            {isLast ? (
              // Last segment — has the dropdown
              <Dropdown
                open={menuOpen}
                onOpenChange={(_, open) => setMenuOpen(open)}
              >
                <MenuButton
                  variant="plain"
                  size="sm"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.75,
                    py: 0.25,
                    fontWeight: 600,
                    minWidth: 0,
                  }}
                >
                  <FolderIcon sx={{ fontSize: 16, color: '#e3b341' }} />
                  <Typography
                    level="body-sm"
                    noWrap
                    sx={{
                      fontWeight: 600,
                      color: 'inherit',
                    }}
                  >
                    {segment}
                  </Typography>
                  <ArrowDropDownIcon
                    sx={{ fontSize: 16, color: 'neutral.400' }}
                  />
                </MenuButton>
                <Menu
                  placement="bottom-start"
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    minWidth: 200,
                  }}
                >
                  {/* Go up option */}
                  <MenuItem onClick={handleGoUp}>
                    <Typography
                      level="body-sm"
                      sx={{ fontStyle: 'italic', color: 'neutral.400' }}
                    >
                      .. (go up)
                    </Typography>
                  </MenuItem>
                  {loadingFolders ? (
                    <MenuItem disabled>
                      <CircularProgress size="sm" sx={{ mx: 'auto' }} />
                    </MenuItem>
                  ) : subfolders.length === 0 ? (
                    <MenuItem disabled>
                      <Typography level="body-sm" sx={{ color: 'neutral.500' }}>
                        No subfolders
                      </Typography>
                    </MenuItem>
                  ) : (
                    subfolders.map((f) => (
                      <MenuItem
                        key={f}
                        onClick={() => handleSelectSubfolder(f)}
                      >
                        <FolderIcon
                          sx={{ fontSize: 16, color: '#e3b341', mr: 1 }}
                        />
                        <Typography level="body-sm">{f}</Typography>
                      </MenuItem>
                    ))
                  )}
                </Menu>
              </Dropdown>
            ) : (
              // Parent segment — clickable to navigate up
              <Box
                onClick={() => navigateToDepth(index)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 'sm',
                  flexShrink: 0,
                  minWidth: 0,
                }}
              >
                <FolderIcon sx={{ fontSize: 16, color: '#e3b341' }} />
                <Typography
                  level="body-sm"
                  noWrap
                >
                  {segment}
                </Typography>
              </Box>
            )}
          </React.Fragment>
        );
      })}

      {/* If at root level (no folder selected), show a dropdown to pick top-level folder */}
      {segments.length === 0 && (
        <>
          <ChevronRightIcon
            sx={{ fontSize: 14, color: 'neutral.500', flexShrink: 0 }}
          />
          <Dropdown
            open={menuOpen}
            onOpenChange={(_, open) => setMenuOpen(open)}
          >
            <MenuButton
              variant="plain"
              size="sm"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                minWidth: 0,
              }}
            >
              <FolderIcon sx={{ fontSize: 16, color: '#e3b341' }} />
              <Typography level="body-sm" noWrap>
                All folders
              </Typography>
              <ArrowDropDownIcon sx={{ fontSize: 16, color: 'neutral.400' }} />
            </MenuButton>
            <Menu
              placement="bottom-start"
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                minWidth: 200,
              }}
            >
              {loadingFolders ? (
                <MenuItem disabled>
                  <CircularProgress size="sm" sx={{ mx: 'auto' }} />
                </MenuItem>
              ) : subfolders.length === 0 ? (
                <MenuItem disabled>
                  <Typography level="body-sm" sx={{ color: 'neutral.500' }}>
                    No folders found
                  </Typography>
                </MenuItem>
              ) : (
                subfolders.map((f) => (
                  <MenuItem key={f} onClick={() => handleSelectSubfolder(f)}>
                    <FolderIcon
                      sx={{ fontSize: 16, color: '#e3b341', mr: 1 }}
                    />
                    <Typography level="body-sm">{f}</Typography>
                  </MenuItem>
                ))
              )}
            </Menu>
          </Dropdown>
        </>
      )}
    </Box>
  );
}
