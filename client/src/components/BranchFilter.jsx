import React from 'react';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export default function BranchFilter({ branches = [], value, onChange }) {
  return (
    <Select
      size="sm"
      variant="outlined"
      value={value || '__all__'}
      onChange={(_, val) => onChange(val === '__all__' ? null : val)}
      startDecorator={<AccountTreeIcon sx={{ fontSize: 16 }} />}
      sx={{ minWidth: 220 }}
      slotProps={{
        listbox: {
          sx: { maxHeight: 300 },
        },
      }}
    >
      <Option value="__all__">All branches</Option>
      {branches.map((b) => (
        <Option key={b} value={b}>
          {b}
        </Option>
      ))}
    </Select>
  );
}
