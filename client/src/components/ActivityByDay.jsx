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
  Cell,
} from 'recharts';

const GRID_COLOR = 'var(--joy-palette-neutral-600, #30363d)';
const TICK_COLOR = 'var(--joy-palette-neutral-300, #8b949e)';
const TOOLTIP_BG = 'var(--joy-palette-background-surface, #161b22)';
const TOOLTIP_BORDER = 'var(--joy-palette-neutral-600, #30363d)';
const TOOLTIP_TEXT = 'var(--joy-palette-neutral-100, #c9d1d9)';

const DAY_COLORS = {
  Sun: 'var(--joy-palette-neutral-500, #484f58)',
  Mon: 'var(--joy-palette-success-800, #0e4429)',
  Tue: 'var(--joy-palette-success-900, #006d32)',
  Wed: 'var(--joy-palette-success-400, #39d353)',
  Thu: 'var(--joy-palette-success-400, #39d353)',
  Fri: 'var(--joy-palette-success-900, #006d32)',
  Sat: 'var(--joy-palette-neutral-500, #484f58)',
};
const DAY_FALLBACK = 'var(--joy-palette-success-500, #2ea043)';

export default function ActivityByDay({ data = [] }) {
  if (!data.length) return null;

  return (
    <Card variant="outlined">
      <Typography level="title-sm" sx={{ mb: 1, color: 'text.primary' }}>
        Commits by Day of Week
      </Typography>
      <Box sx={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="day" tick={{ fill: TICK_COLOR, fontSize: 11 }} />
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
            <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={DAY_COLORS[entry.day] || DAY_FALLBACK}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  );
}
