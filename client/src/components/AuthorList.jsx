import React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Avatar from '@mui/joy/Avatar';
import Chip from '@mui/joy/Chip';
import LinearProgress from '@mui/joy/LinearProgress';
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

// Joy palette-based avatar colors for visual differentiation
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

export default function AuthorList({
  authors = [],
  selectedAuthors = [],
  onSelect,
  maxCommits,
}) {
  if (!authors.length) return null;

  const max = maxCommits || Math.max(...authors.map((a) => a.commits));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {authors.map((author) => {
        const isSelected = selectedAuthors.includes(author.email);
        return (
          <Card
            key={author.email}
            variant={isSelected ? 'soft' : 'plain'}
            color={isSelected ? 'primary' : undefined}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.15s',
              p: 1.5,
              '&:hover': {
                bgcolor: isSelected ? 'primary.softBg' : 'neutral.100',
              },
            }}
            onClick={() => onSelect(author.email)}
          >
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Avatar
                size="sm"
                sx={{
                  bgcolor: hashColor(author.email),
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  '--Avatar-size': '32px',
                }}
              >
                {getInitials(author.name)}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography level="title-sm" noWrap>
                  {author.name}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    mt: 0.5,
                    alignItems: 'center',
                  }}
                >
                  <Chip
                    size="sm"
                    variant="soft"
                    color="neutral"
                    startDecorator={<CommitIcon sx={{ fontSize: 12 }} />}
                    sx={{ '--Chip-minHeight': '20px', fontSize: '0.7rem' }}
                  >
                    {formatNumber(author.commits)}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="success"
                    startDecorator={<AddIcon sx={{ fontSize: 12 }} />}
                    sx={{ '--Chip-minHeight': '20px', fontSize: '0.7rem' }}
                  >
                    {formatNumber(author.linesAdded)}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="danger"
                    startDecorator={<RemoveIcon sx={{ fontSize: 12 }} />}
                    sx={{ '--Chip-minHeight': '20px', fontSize: '0.7rem' }}
                  >
                    {formatNumber(author.linesRemoved)}
                  </Chip>
                </Box>

                <LinearProgress
                  determinate
                  value={(author.commits / max) * 100}
                  size="sm"
                  color="primary"
                  sx={{
                    mt: 0.75,
                    '--LinearProgress-radius': '4px',
                    '--LinearProgress-thickness': '4px',
                  }}
                />
              </Box>
            </Box>
          </Card>
        );
      })}
    </Box>
  );
}
