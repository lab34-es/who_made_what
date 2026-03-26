import React, { useMemo, useState } from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Tooltip from '@mui/joy/Tooltip';
import Card from '@mui/joy/Card';
import Tab from '@mui/joy/Tab';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';
import DailyBreakdown from './DailyBreakdown';

// These define the internal coordinate system of the SVG (viewBox units).
// The actual rendered size is always 100% of the container width.
const CELL_SIZE = 15;
const CELL_GAP = 4;
const TOTAL_SIZE = CELL_SIZE + CELL_GAP;

// GitHub light-theme contribution colors
const LEVELS = [
  '#ebedf0', // level 0 - no contributions (light gray)
  '#9be9a8', // level 1 - light green
  '#40c463', // level 2 - medium green
  '#30a14e', // level 3 - dark green
  '#216e39', // level 4 - darkest green
];

const TEXT_COLOR = '#57606a';

function getLevel(count, max) {
  if (count === 0) return 0;
  if (max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const LEFT_PAD = 40;
const TOP_PAD = 22;

export default function HeatmapChart({ data = {}, dailyBreakdown = [] }) {
  const [activeTab, setActiveTab] = useState(0);

  const { weeks, maxCount, monthPositions } = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now);
    // Go to the next Saturday (end of current week)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 52 * 7 + 1); // 52 weeks back

    const weeks = [];
    const monthPositions = [];
    let currentMonth = -1;
    let weekIdx = 0;

    const cursor = new Date(startDate);
    // Align to Sunday
    cursor.setDate(cursor.getDate() - cursor.getDay());

    while (cursor <= endDate) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        const count = data[dateStr] || 0;
        const isToday = dateStr === now.toISOString().slice(0, 10);

        if (cursor.getMonth() !== currentMonth) {
          currentMonth = cursor.getMonth();
          monthPositions.push({ month: currentMonth, weekIdx });
        }

        week.push({ date: dateStr, count, dayOfWeek: d, isToday });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      weekIdx++;
    }

    const counts = Object.values(data);
    const maxCount = counts.length ? Math.max(...counts) : 1;

    return { weeks, maxCount, monthPositions };
  }, [data]);

  const svgWidth = weeks.length * TOTAL_SIZE + LEFT_PAD + 8;
  const svgHeight = 7 * TOTAL_SIZE + TOP_PAD + 4;

  return (
    <Card
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: '#ffffff',
        borderColor: '#d0d7de',
      }}
    >
      <Typography level="title-sm" sx={{ mb: 1, color: TEXT_COLOR }}>
        Contribution Activity
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        size="sm"
        sx={{ bgcolor: 'transparent' }}
      >
        <TabList
          variant="plain"
          sx={{
            '--ListItem-radius': '6px',
            '--List-gap': '4px',
            gap: 0.5,
            mb: 1.5,
          }}
        >
          <Tab
            variant={activeTab === 0 ? 'soft' : 'plain'}
            color={activeTab === 0 ? 'primary' : 'neutral'}
          >
            Graph
          </Tab>
          <Tab
            variant={activeTab === 1 ? 'soft' : 'plain'}
            color={activeTab === 1 ? 'primary' : 'neutral'}
          >
            Daily Breakdown
          </Tab>
        </TabList>
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box sx={{ width: '100%' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width="100%"
              style={{ display: 'block' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Day labels */}
              {DAY_LABELS.map((label, i) =>
                label ? (
                  <text
                    key={i}
                    x={0}
                    y={i * TOTAL_SIZE + TOP_PAD + CELL_SIZE - 1}
                    fill={TEXT_COLOR}
                    fontSize={12}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
                  >
                    {label}
                  </text>
                ) : null,
              )}

              {/* Month labels */}
              {monthPositions.map(({ month, weekIdx }, i) => (
                <text
                  key={i}
                  x={weekIdx * TOTAL_SIZE + LEFT_PAD}
                  y={12}
                  fill={TEXT_COLOR}
                  fontSize={12}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif"
                >
                  {MONTH_LABELS[month]}
                </text>
              ))}

              {/* Cells */}
              {weeks.map((week, wi) =>
                week.map((day) => (
                  <Tooltip
                    key={day.date}
                    title={`${day.count} commit${day.count !== 1 ? 's' : ''} on ${day.date}`}
                    arrow
                    size="sm"
                  >
                    <rect
                      x={wi * TOTAL_SIZE + LEFT_PAD}
                      y={day.dayOfWeek * TOTAL_SIZE + TOP_PAD}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={3}
                      ry={3}
                      fill={LEVELS[getLevel(day.count, maxCount)]}
                      stroke={day.isToday ? '#57606a' : 'rgba(27, 31, 36, 0.06)'}
                      strokeWidth={1}
                      style={{
                        cursor: 'default',
                        shapeRendering: 'geometricPrecision',
                      }}
                    />
                  </Tooltip>
                )),
              )}
            </svg>
          </Box>

          {/* Legend - right-aligned to match GitHub */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
            }}
          >
            <Typography
              level="body-xs"
              sx={{ color: TEXT_COLOR, mr: 0.5, fontSize: 12 }}
            >
              Less
            </Typography>
            {LEVELS.map((color, i) => (
              <Box
                key={i}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '3px',
                  bgcolor: color,
                  border: '1px solid rgba(27, 31, 36, 0.06)',
                }}
              />
            ))}
            <Typography
              level="body-xs"
              sx={{ color: TEXT_COLOR, ml: 0.5, fontSize: 12 }}
            >
              More
            </Typography>
          </Box>
        </>
      )}

      {activeTab === 1 && <DailyBreakdown data={dailyBreakdown} />}
    </Card>
  );
}
