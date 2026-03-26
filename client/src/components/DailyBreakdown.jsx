import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Avatar from '@mui/joy/Avatar';
import Divider from '@mui/joy/Divider';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CommitIcon from '@mui/icons-material/Commit';

function getInitials(name) {
  return name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  'var(--joy-palette-primary-700, #238636)',
  'var(--joy-palette-primary-600, #2ea043)',
  'var(--joy-palette-success-400, #39d353)',
  'var(--joy-palette-success-800, #0e4429)',
  'var(--joy-palette-neutral-500, #484f58)',
  'var(--joy-palette-danger-500, #f85149)',
  'var(--joy-palette-neutral-300, #8b949e)',
  'var(--joy-palette-primary-500, #3fb950)',
  'var(--joy-palette-success-900, #006d32)',
  'var(--joy-palette-neutral-400, #6e7681)',
];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function DailyBreakdown({ data = [] }) {
  if (!data.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography level="body-sm" sx={{ color: 'neutral.500' }}>
          No activity found for the selected filters.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {data.map((day, dayIdx) => (
        <Box key={day.date}>
          {dayIdx > 0 && <Divider sx={{ my: 1 }} />}
          <Typography
            level="title-sm"
            sx={{
              color: 'text.primary',
              mb: 0.75,
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            {formatDate(day.date)}
          </Typography>

          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 1 }}
          >
            {day.contributors.map((c) => (
              <Box
                key={c.email}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.25,
                }}
              >
                <Avatar
                  size="sm"
                  sx={{
                    bgcolor: hashColor(c.email),
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    '--Avatar-size': '24px',
                  }}
                >
                  {getInitials(c.name)}
                </Avatar>

                <Typography
                  level="body-sm"
                  noWrap
                  sx={{ minWidth: 0, fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {c.name}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    ml: 'auto',
                    flexShrink: 0,
                  }}
                >
                  <Chip
                    size="sm"
                    variant="soft"
                    color="neutral"
                    startDecorator={<CommitIcon sx={{ fontSize: 11 }} />}
                    sx={{ '--Chip-minHeight': '18px', fontSize: '0.7rem' }}
                  >
                    {formatNumber(c.commits)}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="success"
                    startDecorator={<AddIcon sx={{ fontSize: 11 }} />}
                    sx={{ '--Chip-minHeight': '18px', fontSize: '0.7rem' }}
                  >
                    {formatNumber(c.linesAdded)}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="danger"
                    startDecorator={<RemoveIcon sx={{ fontSize: 11 }} />}
                    sx={{ '--Chip-minHeight': '18px', fontSize: '0.7rem' }}
                  >
                    {formatNumber(c.linesRemoved)}
                  </Chip>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
