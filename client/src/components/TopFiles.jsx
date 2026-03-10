import React from 'react';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Chip from '@mui/joy/Chip';
import Box from '@mui/joy/Box';

function formatNum(n) {
  return n.toLocaleString();
}

export default function TopFiles({ data = [] }) {
  if (!data.length) return null;

  return (
    <Card variant="outlined" sx={{ overflow: 'auto' }}>
      <Typography level="title-sm" sx={{ mb: 1, color: 'text.primary' }}>
        Top Modified Files
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
          '& th:nth-of-type(2)': { width: 80 },
          '& th:nth-of-type(3)': { width: 100 },
          '& th:nth-of-type(4)': { width: 100 },
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
    </Card>
  );
}
