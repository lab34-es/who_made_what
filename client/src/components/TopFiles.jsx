import React from 'react';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Chip from '@mui/joy/Chip';
import Box from '@mui/joy/Box';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import IconButton from '@mui/joy/IconButton';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

function formatNum(n) {
  return n.toLocaleString();
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function TopFiles({
  data = [],
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
}) {
  if (!data.length && total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <Sheet
      variant="outlined"
      sx={{
        borderRadius: 'sm',
        overflow: 'hidden',
        bgcolor: 'background.surface',
      }}
    >
      {/* Title bar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1.5,
        }}
      >
        <Typography level="title-md" sx={{ color: 'text.primary' }}>
          Top Modified Files
        </Typography>
        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
          {total.toLocaleString()} file{total !== 1 ? 's' : ''} total
        </Typography>
      </Box>

      {/* Table */}
      <Table
        size="md"
        borderAxis="xBetween"
        sx={{
          '--TableCell-headBackground': 'transparent',
          '& thead th': {
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: 'var(--joy-fontSize-sm)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            py: 1.5,
            px: 2,
          },
          '& tbody td': {
            fontSize: 'var(--joy-fontSize-sm)',
            py: 1.5,
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          '& tbody tr:last-child td': {
            borderBottom: 'none',
          },
          '& tbody tr:hover td': {
            bgcolor: 'background.level1',
          },
          '& th:not(:first-of-type)': { textAlign: 'right' },
          '& td:not(:first-of-type)': { textAlign: 'right' },
          '& th:nth-of-type(2)': { width: 90 },
          '& th:nth-of-type(3)': { width: 110 },
          '& th:nth-of-type(4)': { width: 110 },
        }}
      >
        <thead>
          <tr>
            <th>File</th>
            <th>Commits</th>
            <th>Added</th>
            <th>Removed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((file) => (
            <tr key={file.path}>
              <td>
                <Typography
                  level="body-sm"
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
                <Chip size="sm" variant="soft" color="neutral">
                  {file.commits}
                </Chip>
              </td>
              <td>
                <Box
                  component="span"
                  sx={{ color: 'success.400', fontFamily: 'code' }}
                >
                  +{formatNum(file.added)}
                </Box>
              </td>
              <td>
                <Box
                  component="span"
                  sx={{ color: 'danger.500', fontFamily: 'code' }}
                >
                  -{formatNum(file.removed)}
                </Box>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination footer */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 2,
          px: 2,
          py: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.level1',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
            Rows per page:
          </Typography>
          <Select
            size="sm"
            variant="plain"
            value={pageSize}
            onChange={(_, value) => onPageSizeChange?.(value)}
            sx={{
              minWidth: 56,
              fontSize: 'var(--joy-fontSize-sm)',
            }}
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <Option key={opt} value={opt}>
                {opt}
              </Option>
            ))}
          </Select>
        </Box>

        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
          {startRecord}&ndash;{endRecord} of {total.toLocaleString()}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="sm"
            variant="outlined"
            color="neutral"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            aria-label="Previous page"
          >
            <KeyboardArrowLeftIcon />
          </IconButton>

          <IconButton
            size="sm"
            variant="outlined"
            color="neutral"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
            aria-label="Next page"
          >
            <KeyboardArrowRightIcon />
          </IconButton>
        </Box>
      </Box>
    </Sheet>
  );
}
