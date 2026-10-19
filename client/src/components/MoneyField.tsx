import { useLayoutEffect, useRef, useState } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import { formatMoney, moneyInputProblem, moneyInputText, parseMoneyInput } from '../lib/money';

interface MoneyFieldProps {
  value: number;
  /** Called with dollars when the box is left (or Enter is pressed) holding a different, valid amount. */
  onCommit: (dollars: number) => void;
  /**
   * Called while typing with the amount so far, so the page can react before anything is saved.
   * Null means "nothing usable": the text isn't an amount, or the edit was abandoned.
   */
  onDraft?: (dollars: number | null) => void;
  /**
   * When set, "10%" is accepted and means 10% of this number (the plan's income), and an amount above it gets a note
   * while typing that it's more than the whole income.
   */
  percentOf?: number;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: TextFieldProps['size'];
  sx?: TextFieldProps['sx'];
}

/**
 * An amount box that saves itself: shows "$1,234" at rest, plain digits while editing.
 * Escape puts the old amount back.
 */
export function MoneyField({ value, onCommit, onDraft, percentOf, label, ariaLabel, disabled, size = 'small', sx }: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const invalid = problem !== null;
  const cancelled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectAll = useRef(false);
  const keepSelection = useRef(false);

  // Entering the box swaps "$1,234" for plain digits; select them once that has rendered so typing replaces the amount.
  useLayoutEffect(() => {
    if (!selectAll.current) return;
    selectAll.current = false;
    inputRef.current?.select();
  });

  const drafted = draft === null ? null : parseMoneyInput(draft, percentOf);
  const overIncome = percentOf !== undefined && percentOf > 0 && drafted !== null && drafted > percentOf;

  const finish = () => {
    keepSelection.current = false;
    if (cancelled.current || draft === null) {
      cancelled.current = false;
      setDraft(null);
      setProblem(null);
      onDraft?.(null);
      return;
    }
    const dollars = parseMoneyInput(draft, percentOf);
    if (dollars === null) {
      setProblem(moneyInputProblem(draft, percentOf));
      onDraft?.(null);
      return;
    }
    setDraft(null);
    onDraft?.(null);
    if (dollars !== value) onCommit(dollars);
  };

  return (
    <TextField
      label={label}
      size={size}
      disabled={disabled}
      sx={sx}
      value={draft ?? formatMoney(value)}
      error={invalid}
      helperText={problem ?? (overIncome ? "That's more than your whole income." : undefined)}
      inputRef={inputRef}
      onFocus={() => {
        if (draft !== null) return;
        selectAll.current = true;
        keepSelection.current = true;
        setDraft(moneyInputText(value, { emptyForZero: true }));
      }}
      onMouseUp={(event) => {
        // The click that focused the box would otherwise drop the selection again.
        if (keepSelection.current) event.preventDefault();
        keepSelection.current = false;
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        setProblem(null);
        onDraft?.(parseMoneyInput(event.target.value, percentOf));
      }}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancelled.current = true;
        if (event.key === 'Enter' || event.key === 'Escape') (event.target as HTMLInputElement).blur();
      }}
      slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': ariaLabel ?? label, style: { textAlign: 'right' } } }}
    />
  );
}
