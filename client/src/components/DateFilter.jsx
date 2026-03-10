import React, { useState, useCallback } from 'react';
import Box from '@mui/joy/Box';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Typography from '@mui/joy/Typography';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

/** Format a Date object as YYYY-MM-DD (local time). */
function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Preset definitions. Each entry computes { from, to } date strings. */
const PRESETS = [
  { label: 'Custom', value: 'custom' },
  {
    label: 'Last 24 hours',
    value: '24h',
    calc: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 1);
      return { from: fmt(from), to: fmt(now) };
    },
  },
  {
    label: 'Last 2 days',
    value: '2d',
    calc: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 2);
      return { from: fmt(from), to: fmt(now) };
    },
  },
  {
    label: 'Last 7 days',
    value: '7d',
    calc: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: fmt(from), to: fmt(now) };
    },
  },
  {
    label: 'Last 14 days',
    value: '14d',
    calc: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 14);
      return { from: fmt(from), to: fmt(now) };
    },
  },
  {
    label: 'Last month',
    value: '1m',
    calc: () => {
      const now = new Date();
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      return { from: fmt(from), to: fmt(now) };
    },
  },
  {
    label: 'Since big bang',
    value: 'all',
    calc: () => ({ from: null, to: null }),
  },
];

/**
 * Date range filter with preset quick-select and manual "From" / "To" inputs.
 */
export default function DateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}) {
  const [preset, setPreset] = useState('all');

  const handlePresetChange = useCallback(
    (_, value) => {
      if (!value) return;
      setPreset(value);
      const entry = PRESETS.find((p) => p.value === value);
      if (entry?.calc) {
        const { from, to } = entry.calc();
        onDateFromChange(from);
        onDateToChange(to);
      }
    },
    [onDateFromChange, onDateToChange],
  );

  const handleFromChange = useCallback(
    (e) => {
      setPreset('custom');
      onDateFromChange(e.target.value || null);
    },
    [onDateFromChange],
  );

  const handleToChange = useCallback(
    (e) => {
      setPreset('custom');
      onDateToChange(e.target.value || null);
    },
    [onDateToChange],
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Select
        size="sm"
        variant="outlined"
        value={preset}
        onChange={handlePresetChange}
        startDecorator={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
        sx={{ minWidth: 160 }}
        slotProps={{
          listbox: { sx: { maxHeight: 300 } },
        }}
      >
        {PRESETS.map((p) => (
          <Option key={p.value} value={p.value}>
            {p.label}
          </Option>
        ))}
      </Select>

      <Typography level="body-xs" sx={{ color: 'neutral.500', flexShrink: 0 }}>
        From
      </Typography>
      <Input
        type="date"
        size="sm"
        value={dateFrom || ''}
        onChange={handleFromChange}
        slotProps={{
          input: {
            max: dateTo || undefined,
          },
        }}
        sx={{ minWidth: 140 }}
      />
      <Typography level="body-xs" sx={{ color: 'neutral.500', flexShrink: 0 }}>
        To
      </Typography>
      <Input
        type="date"
        size="sm"
        value={dateTo || ''}
        onChange={handleToChange}
        slotProps={{
          input: {
            min: dateFrom || undefined,
          },
        }}
        sx={{ minWidth: 140 }}
      />
    </Box>
  );
}
