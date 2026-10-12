import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { errorMessage } from '../../api/client';
import { formatMoney, parsePercentInput } from '../../lib/money';
import { useSetSplit, type Account } from './investments';

/**
 * Sets every account's share of the monthly amount in one go, because they have to total 100%.
 * Plain controlled inputs rather than a form library: the list of fields is the list of accounts.
 */
export function SplitDialog({ open, accounts, monthlyAmount, onClose }: { open: boolean; accounts: Account[]; monthlyAmount: number; onClose: () => void }) {
  const setSplit = useSetSplit();
  const [shares, setShares] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setSplit.reset();
    setShares(Object.fromEntries(accounts.map((a) => [a.id, String(a.sharePercent)])));
  }, [open, accounts]);

  const parsed = accounts.map((a) => parsePercentInput(shares[a.id] ?? '') ?? (shares[a.id]?.trim() === '' ? 0 : null));
  const allValid = parsed.every((value) => value !== null);
  const total = parsed.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const totalsHundred = Math.abs(total - 100) <= 0.01;

  const splitEvenly = () => {
    // Whole-ish numbers that still add up to exactly 100: the first account takes the rounding.
    const each = Math.floor((100 / accounts.length) * 100) / 100;
    const first = Number((100 - each * (accounts.length - 1)).toFixed(2));
    setShares(Object.fromEntries(accounts.map((a, index) => [a.id, String(index === 0 ? first : each)])));
  };

  const save = () => {
    if (!allValid || !totalsHundred) return;
    setSplit.mutate(
      accounts.map((a, index) => ({ id: a.id, sharePercent: parsed[index] ?? 0 })),
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Split your monthly amount</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Choose what share of your {formatMoney(monthlyAmount)}/month each account gets. The shares must add up to 100%.
        </Typography>
        <Stack spacing={2}>
          {setSplit.isError && <Alert severity="error">{errorMessage(setSplit.error)}</Alert>}
          {accounts.map((account, index) => (
            <Box key={account.id} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 2, alignItems: 'center' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap>{account.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatMoney((monthlyAmount * (parsed[index] ?? 0)) / 100)}/month
                </Typography>
              </Box>
              <TextField
                size="small"
                value={shares[account.id] ?? ''}
                error={parsed[index] === null}
                onChange={(event) => setShares((current) => ({ ...current, [account.id]: event.target.value }))}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', 'aria-label': `${account.name} share`, style: { textAlign: 'right' } },
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                }}
              />
            </Box>
          ))}
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Button size="small" onClick={splitEvenly}>
            Split evenly
          </Button>
          <Typography color={allValid && totalsHundred ? 'success.main' : 'error.main'} sx={{ fontWeight: 600 }} role="status">
            {allValid ? `Total ${Number(total.toFixed(2))}%` : 'Enter shares from 0 to 100'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!allValid || !totalsHundred || setSplit.isPending} onClick={save}>
          Save split
        </Button>
      </DialogActions>
    </Dialog>
  );
}
