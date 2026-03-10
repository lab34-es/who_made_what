import React from 'react';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Box from '@mui/joy/Box';
import Tooltip from '@mui/joy/Tooltip';

function formatNum(n) {
  return n.toLocaleString();
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export default function RecentFiles({ data = [] }) {
  if (!data.length) return null;

  return (
    <Card variant="outlined" sx={{ overflow: 'auto' }}>
      <Typography level="title-sm" sx={{ mb: 1, color: 'text.primary' }}>
        Most Recent Updated Files
      </Typography>
      <Table
        size="sm"
        borderAxis="none"
        sx={{
          '& th': {
            color: 'text.tertiary',
            fontWeight: 500,
            fontSize: 'var(--joy-fontSize-xs)',
          },
          '& td': {
            color: 'text.primary',
            fontSize: 'var(--joy-fontSize-xs)',
            py: 0.75,
          },
          '& tr:hover td': { bgcolor: 'neutral.200' },
          '& th:not(:first-of-type)': { textAlign: 'right' },
          '& td:not(:first-of-type)': { textAlign: 'right' },
          '& th:nth-of-type(2)': { width: 120 },
          '& th:nth-of-type(3)': { width: 140 },
          '& th:nth-of-type(4)': { width: 120 },
        }}
      >
        <thead>
          <tr>
            <th>File</th>
            <th>When</th>
            <th>Who</th>
            <th>Changes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((file) => (
            <tr key={file.path}>
              <td>
                <Typography
                  level="body-xs"
                  sx={{
                    fontFamily: 'code',
                    color: 'text.primary',
                    wordBreak: 'break-all',
                  }}
                >
                  {file.path}
                </Typography>
              </td>
              <td>
                <Tooltip title={new Date(file.date).toLocaleString()} arrow>
                  <Typography
                    level="body-xs"
                    sx={{ color: 'text.secondary', cursor: 'default' }}
                  >
                    {timeAgo(file.date)}
                  </Typography>
                </Tooltip>
              </td>
              <td>
                <Typography
                  level="body-xs"
                  sx={{ color: 'text.secondary' }}
                  noWrap
                >
                  {file.author}
                </Typography>
              </td>
              <td>
                <Box
                  sx={{
                    display: 'inline-flex',
                    gap: 1,
                    fontFamily: 'code',
                  }}
                >
                  <Box component="span" sx={{ color: 'success.400' }}>
                    +{formatNum(file.added)}
                  </Box>
                  <Box component="span" sx={{ color: 'danger.500' }}>
                    -{formatNum(file.removed)}
                  </Box>
                </Box>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
