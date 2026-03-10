import React from 'react';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Box from '@mui/joy/Box';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const GRID_COLOR = 'var(--joy-palette-neutral-600, #30363d)';
const TICK_COLOR = 'var(--joy-palette-neutral-300, #8b949e)';
const TOOLTIP_BG = 'var(--joy-palette-background-surface, #161b22)';
const TOOLTIP_BORDER = 'var(--joy-palette-neutral-600, #30363d)';
const TOOLTIP_TEXT = 'var(--joy-palette-neutral-100, #c9d1d9)';
const BAR_COLOR = 'var(--joy-palette-success-600, #238636)';

export default function ActivityByHour({ data = [] }) {
  if (!data.length) return null;

  return (
    <Card variant="outlined">
      <Typography level="title-sm" sx={{ mb: 1, color: 'text.primary' }}>
        Commits by Hour of Day
      </Typography>
      <Box sx={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey="hour"
              tick={{ fill: TICK_COLOR, fontSize: 9 }}
              interval={1}
            />
            <YAxis
              tick={{ fill: TICK_COLOR, fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: TOOLTIP_BG,
                border: `1px solid ${TOOLTIP_BORDER}`,
                borderRadius: 6,
                color: TOOLTIP_TEXT,
                fontSize: 12,
              }}
            />
            <Bar dataKey="commits" fill={BAR_COLOR} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  );
}
