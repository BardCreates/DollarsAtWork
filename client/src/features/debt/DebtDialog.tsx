import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
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
  minimumOnly: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', type: 'CreditCard', balance: '', apr: '', minPayment: '', minimumOnly: false };

/** Add a debt, or edit one when `debt` is given. */
export function DebtDialog({ open, debt, onClose }: { open: boolean; debt?: Debt; onClose: () => void }) {
  const add = useAddDebt();
  const update = useUpdateDebt();
  const saving = debt ? update : add;

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  // Start from the debt being edited (or a blank form) every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    add.reset();
    update.reset();
    reset(
      debt
        ? { name: debt.name, type: debt.type, balance: String(debt.balance), apr: String(debt.apr), minPayment: String(debt.minPayment), minimumOnly: debt.minimumOnly }
        : blank,
    );
  }, [open, debt]);

  // A new mortgage starts as minimum-only; switching away from Mortgage switches it back off. Editing never changes it on its own.
  const type = watch('type');
  const lastType = useRef(type);
  useEffect(() => {
    if (!debt && lastType.current !== type) setValue('minimumOnly', type === 'Mortgage');
    lastType.current = type;
  }, [type, debt, setValue]);

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
      minimumOnly: values.minimumOnly,
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
              helperText={fieldError('minPayment') ?? (type === 'Mortgage' ? 'Principal and interest only, not escrow (taxes and insurance).' : undefined)}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <Controller
              name="minimumOnly"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                    label="Minimum only, keep it out of the payoff order"
                  />
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ pl: 0.5 }}>
                    For a mortgage or a long loan you pay on its own schedule. It still counts against your net worth, but your extra money
                    skips it and "debt-free" means everything else.
                  </Typography>
                </Box>
              )}
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
