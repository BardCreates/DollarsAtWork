import { useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { errorMessage } from '../../api/client';
import { formatMoney, parseMoneyInput } from '../../lib/money';
import { useCheckIn, type BalanceUpdate, type NetWorthData } from './networth';
import type { DashboardData } from './useDashboard';

interface Row {
  key: string;
  id: string;
  name: string;
  balance: number;
}

interface Section {
  field: 'goals' | 'debts' | 'accounts' | 'items';
  title: string;
  rows: Row[];
}

function sections(data: DashboardData): Section[] {
  const row = (prefix: string, id: string, name: string, balance: number): Row => ({ key: `${prefix}:${id}`, id, name, balance });
  const all: Section[] = [
    { field: 'goals', title: 'Savings goals', rows: data.savings.goals.map((g) => row('goal', g.id, g.name, g.currentBalance)) },
    { field: 'debts', title: 'Debts', rows: data.debts.debts.map((d) => row('debt', d.id, d.name, d.balance)) },
    { field: 'accounts', title: 'Investment accounts', rows: data.investments.accounts.map((a) => row('account', a.id, a.name, a.balance)) },
    { field: 'items', title: 'Other assets and debts', rows: data.netWorth.items.map((i) => row('item', i.id, i.name, i.value)) },
  ];
  return all.filter((section) => section.rows.length > 0);
}

/**
 * The monthly check-in: every balance on one screen, to confirm or correct.
 * Plain controlled inputs rather than a form library: the fields are whatever the user tracks.
 */
export function CheckInDialog({ open, data, onClose, onSaved }: { open: boolean; data: DashboardData; onClose: () => void; onSaved: (result: NetWorthData) => void }) {
  const checkIn = useCheckIn();
  const [values, setValues] = useState<Record<string, string>>({});
  const groups = sections(data);

  useEffect(() => {
    if (!open) return;
    checkIn.reset();
    setValues(Object.fromEntries(sections(data).flatMap((section) => section.rows.map((row) => [row.key, String(row.balance)]))));
  }, [open]);

  const parsed = (row: Row) => parseMoneyInput(values[row.key] ?? '');
  const allValid = groups.every((section) => section.rows.every((row) => parsed(row) !== null));

  const save = () => {
    if (!allValid) return;
    const updates = (field: Section['field']): BalanceUpdate[] =>
      (groups.find((section) => section.field === field)?.rows ?? []).map((row) => ({ id: row.id, balance: parsed(row) ?? 0 }));
    checkIn.mutate({ goals: updates('goals'), debts: updates('debts'), accounts: updates('accounts'), items: updates('items') }, { onSuccess: onSaved });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Monthly check-in</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Look up each balance and correct any that have changed. Saving records this month's net worth.
        </Typography>
        {checkIn.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage(checkIn.error)}
          </Alert>
        )}
        {groups.length === 0 && <Alert severity="info">You haven't added any goals, debts or accounts yet. Saving now records a net worth of $0.</Alert>}

        {groups.map((section) => (
          <Box key={section.field} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {section.title}
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {section.rows.map((row) => (
                <Box key={row.key} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap>{row.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Was {formatMoney(row.balance)}
                    </Typography>
                  </Box>
                  <TextField
                    size="small"
                    value={values[row.key] ?? ''}
                    error={parsed(row) === null}
                    onChange={(event) => setValues((current) => ({ ...current, [row.key]: event.target.value }))}
                    onFocus={(event) => event.target.select()}
                    slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `${row.name} balance`, style: { textAlign: 'right' } } }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!allValid || checkIn.isPending} onClick={save}>
          Save check-in
        </Button>
      </DialogActions>
    </Dialog>
  );
}
