import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { MoneyField } from '../../components/MoneyField';
import { IncomeSourcesDialog } from './IncomeSourcesDialog';
import { useIncomes } from './incomes';

/**
 * The monthly take-home income box. With income sources it shows their total and opens them to change; without,
 * it's the one number typed in, with a way to add sources for two paychecks or pay that varies.
 */
export function IncomeBox({
  income,
  readOnly,
  onCommit,
  onDraft,
  onSourcesChanged,
}: {
  income: number;
  readOnly: boolean;
  onCommit: (dollars: number) => void;
  onDraft?: (dollars: number | null) => void;
  /** Income sources changed the income from one total to another. */
  onSourcesChanged?: (from: number, to: number) => void;
}) {
  const { data } = useIncomes();
  const [open, setOpen] = useState(false);
  const count = data?.sources.length ?? 0;

  return (
    <Box>
      <MoneyField label="Monthly take-home income" size="medium" value={income} disabled={readOnly || !data || count > 0} onCommit={onCommit} onDraft={onDraft} />
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1, mt: 0.5 }}>
        {count > 0 && (
          <Typography variant="caption" color="text.secondary">
            Adds up from {count} income {count === 1 ? 'source' : 'sources'}.
          </Typography>
        )}
        <Button size="small" sx={{ px: 0.5, minWidth: 0 }} onClick={() => setOpen(true)}>
          {count > 0 ? 'Change sources' : 'Two paychecks, or pay that varies?'}
        </Button>
      </Box>
      <IncomeSourcesDialog open={open} readOnly={readOnly} currentIncome={income} onClose={() => setOpen(false)} onIncomeChanged={onSourcesChanged} />
    </Box>
  );
}
