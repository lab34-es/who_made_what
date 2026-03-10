import React from 'react';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Box from '@mui/joy/Box';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const GRID_COLOR = 'var(--joy-palette-neutral-800, #30363d)';
const TICK_COLOR = 'var(--joy-palette-neutral-800, #8b949e)';
const TOOLTIP_BG = 'var(--joy-palette-background-surface, #161b22)';
const TOOLTIP_BORDER = 'var(--joy-palette-neutral-800, #30363d)';
const TOOLTIP_TEXT = 'var(--joy-palette-neutral-800, #c9d1d9)';
const ACCENT_COLOR = 'var(--joy-palette-success-800, #39d353)';

export default function TimelineChart({ data = [] }) {
  if (!data.length) return null;

  // Show last 52 data points max
  const sliced = data.slice(-52);

  return (
    <Card variant="outlined">
      <Typography level="title-sm" sx={{ mb: 1, color: 'text.primary' }}>
        Commits Over Time
      </Typography>
      <Box sx={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <AreaChart
            data={sliced}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT_COLOR} stopOpacity={0.4} />
                <stop offset="95%" stopColor={ACCENT_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey="week"
              tick={{ fill: TICK_COLOR, fontSize: 10 }}
              tickFormatter={(v) => v.slice(5)} /* MM-DD */
              interval="preserveStartEnd"
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
              labelFormatter={(v) => `Week of ${v}`}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={ACCENT_COLOR}
              fill="url(#colorCommits)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: ACCENT_COLOR }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  );
}
