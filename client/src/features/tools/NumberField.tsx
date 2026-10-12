import { useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Shown before the number, e.g. "$". */
  prefix?: string;
  /** Shown after the number, e.g. "%" or "years". */
  suffix?: string;
  max?: number;
  helperText?: string;
}

/**
 * A number box for the calculators: the result updates as you type, and anything that isn't a
 * number from 0 to max is flagged and ignored. Calculators aren't saved, so there is no form to submit.
 */
export function NumberField({ label, value, onChange, prefix, suffix, max = 999_999_999, helperText }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const cleaned = text.replace(/[\s$,%]/g, '');
  const invalid = cleaned !== '' && (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned) || Number(cleaned) > max);

  return (
    <TextField
      size="small"
      label={label}
      value={text}
      error={invalid}
      helperText={invalid ? `Enter a number from 0 to ${max.toLocaleString('en-US')}.` : helperText}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const digits = next.replace(/[\s$,%]/g, '');
        if (digits === '') onChange(0);
        else if (/^(\d+\.?\d*|\.\d+)$/.test(digits) && Number(digits) <= max) onChange(Number(digits));
      }}
      onFocus={(event) => event.target.select()}
      slotProps={{
        htmlInput: { inputMode: 'decimal' },
        input: {
          startAdornment: prefix ? <InputAdornment position="start">{prefix}</InputAdornment> : undefined,
          endAdornment: suffix ? <InputAdornment position="end">{suffix}</InputAdornment> : undefined,
        },
      }}
    />
  );
}
