import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { parseMoneyInput, parsePercentInput } from '../../lib/money';
import { debtTypeLabels, useAddDebt, useUpdateDebt, type Debt, type DebtType } from './debts';

const debtTypes = Object.keys(debtTypeLabels) as [DebtType, ...DebtType[]];
const isAmount = (text: string) => text.trim() !== '' && parseMoneyInput(text) !== null;

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  type: z.enum(debtTypes),
  balance: z.string().refine(isAmount, 'Enter the balance in dollars.'),
  apr: z.string().refine((text) => parsePercentInput(text) !== null, 'Enter an APR between 0% and 100%.'),
  minPayment: z.string().refine(isAmount, 'Enter the minimum payment in dollars.'),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', type: 'CreditCard', balance: '', apr: '', minPayment: '' };

/** Add a debt, or edit one when `debt` is given. */
export function DebtDialog({ open, debt, onClose }: { open: boolean; debt?: Debt; onClose: () => void }) {
  const add = useAddDebt();
  const update = useUpdateDebt();
  const saving = debt ? update : add;

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  // Start from the debt being edited (or a blank form) every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    add.reset();
    update.reset();
    reset(debt ? { name: debt.name, type: debt.type, balance: String(debt.balance), apr: String(debt.apr), minPayment: String(debt.minPayment) } : blank);
  }, [open, debt]);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const onSubmit = handleSubmit((values) => {
    const fields = {
      name: values.name,
      type: values.type,
      balance: parseMoneyInput(values.balance) ?? 0,
      apr: parsePercentInput(values.apr) ?? 0,
      minPayment: parseMoneyInput(values.minPayment) ?? 0,
    };
    if (debt) update.mutate({ id: debt.id, changes: fields }, { onSuccess: onClose });
    else add.mutate(fields, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>{debt ? `Edit ${debt.name}` : 'Add a debt'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saving.isError && !hasFieldError && <Alert severity="error">{errorMessage(saving.error)}</Alert>}
            <TextField label="Name" placeholder="Visa, car loan…" autoFocus {...muiField(register, 'name')} error={!!fieldError('name')} helperText={fieldError('name')} />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField select label="Type" {...field} error={!!fieldError('type')} helperText={fieldError('type')}>
                  {debtTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {debtTypeLabels[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Balance"
              placeholder="$"
              {...muiField(register, 'balance')}
              error={!!fieldError('balance')}
              helperText={fieldError('balance') ?? 'What you owe today.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="APR"
              placeholder="%"
              {...muiField(register, 'apr')}
              error={!!fieldError('apr')}
              helperText={fieldError('apr') ?? 'The yearly interest rate, like 19.99.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Minimum payment"
              placeholder="$ per month"
              {...muiField(register, 'minPayment')}
              error={!!fieldError('minPayment')}
              helperText={fieldError('minPayment')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving.isPending}>
            {debt ? 'Save changes' : 'Add debt'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
