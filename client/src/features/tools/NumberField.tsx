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
  /** Lowest number accepted. Default 0; a negative min lets a minus sign be typed (a falling share price). */
  min?: number;
  max?: number;
  /** The number must be above 0 (a loan term): 0 or an empty box is flagged instead of used. */
  positive?: boolean;
  helperText?: string;
}

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;

/**
 * A number box for the calculators: the result updates as you type, and anything outside min to max is flagged and
 * ignored, so the result keeps showing the last good number. Calculators aren't saved, so there is no form to submit.
 * The limits keep results believable: a 50%-a-year return for 40 years says more about the guess than the money.
 */
export function NumberField({ label, value, onChange, prefix, suffix, min = 0, max = 100_000_000, positive = false, helperText }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const read = (raw: string): number | null => {
    const cleaned = raw.replace(/[\s$,%]/g, '');
    if (cleaned === '') return positive ? null : 0;
    if (!NUMBER.test(cleaned)) return null;
    const number = Number(cleaned);
    if (number < min || number > max || (positive && number <= 0)) return null;
    return number;
  };
  const invalid = read(text) === null;
  const range = positive ? `more than 0, up to ${max.toLocaleString('en-US')}` : `from ${min.toLocaleString('en-US')} to ${max.toLocaleString('en-US')}`;

  return (
    <TextField
      size="small"
      label={label}
      value={text}
      error={invalid}
      helperText={invalid ? `Enter a number ${range}.` : helperText}
      onChange={(event) => {
        setText(event.target.value);
        const number = read(event.target.value);
        if (number !== null) onChange(number);
      }}
      onFocus={(event) => event.target.select()}
      slotProps={{
        htmlInput: { inputMode: min < 0 ? 'text' : 'decimal' },
        input: {
          startAdornment: prefix ? <InputAdornment position="start">{prefix}</InputAdornment> : undefined,
          endAdornment: suffix ? <InputAdornment position="end">{suffix}</InputAdornment> : undefined,
        },
      }}
    />
  );
}
