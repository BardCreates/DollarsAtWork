import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { formatMoney, moneyInputText, parseMoneyInput, parsePercentInput } from '../../lib/money';
import { yearMonthFromNow } from '../../lib/dates';
import { monthlyInterest } from '../../lib/projection';
import { useGuardedClose } from '../../components/useGuardedClose';
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
  hasPromo: z.boolean(),
  promoApr: z.string(),
  promoEndsMonth: z.string(),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', type: 'CreditCard', balance: '', apr: '', minPayment: '', minimumOnly: false, hasPromo: false, promoApr: '0', promoEndsMonth: '' };

/** Add a debt, or edit one when `debt` is given. */
export function DebtDialog({ open, debt, onClose }: { open: boolean; debt?: Debt; onClose: () => void }) {
  const add = useAddDebt();
  const update = useUpdateDebt();
  const saving = debt ? update : add;

  const { register, control, handleSubmit, reset, watch, setValue, setError, formState: { errors, isDirty } } = useForm<FormValues>({
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
        ? {
            name: debt.name,
            type: debt.type,
            balance: moneyInputText(debt.balance),
            apr: String(debt.apr),
            minPayment: moneyInputText(debt.minPayment),
            minimumOnly: debt.minimumOnly,
            hasPromo: debt.promoEndsMonth !== null,
            promoApr: String(debt.promoApr ?? 0),
            promoEndsMonth: debt.promoEndsMonth ?? '',
          }
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

  // A minimum that doesn't cover the month's interest means the balance grows forever: say so while it's typed.
  const balanceNow = parseMoneyInput(watch('balance'));
  const aprNow = parsePercentInput(watch('apr'));
  const minimumNow = isAmount(watch('minPayment')) ? parseMoneyInput(watch('minPayment')) : null;
  const interestNow = balanceNow !== null && aprNow !== null ? monthlyInterest(balanceNow, aprNow) : 0;
  const minimumMissesInterest = minimumNow !== null && interestNow > 0 && minimumNow <= interestNow;
  const guardedClose = useGuardedClose(open, isDirty, onClose);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const hasPromo = watch('hasPromo');

  const onSubmit = handleSubmit((values) => {
    if (values.hasPromo) {
      if (parsePercentInput(values.promoApr) === null) {
        setError('promoApr', { message: 'Enter the promotional rate, like 0.' });
        return;
      }
      if (!/^\d{4}-\d{2}$/.test(values.promoEndsMonth)) {
        setError('promoEndsMonth', { message: 'Pick the last month of the promotional rate, like 2027-06.' });
        return;
      }
      if (values.promoEndsMonth < yearMonthFromNow(0) && values.promoEndsMonth !== debt?.promoEndsMonth) {
        setError('promoEndsMonth', { message: "That month has passed. Turn the promotion off if it's over." });
        return;
      }
    }
    const fields = {
      name: values.name,
      type: values.type,
      balance: parseMoneyInput(values.balance) ?? 0,
      apr: parsePercentInput(values.apr) ?? 0,
      minPayment: parseMoneyInput(values.minPayment) ?? 0,
      minimumOnly: values.minimumOnly,
      promoApr: values.hasPromo ? (parsePercentInput(values.promoApr) ?? 0) : null,
      promoEndsMonth: values.hasPromo ? values.promoEndsMonth : null,
    };
    // Sending an empty month is how an edit turns a promotion off.
    if (debt) update.mutate({ id: debt.id, changes: { ...fields, promoEndsMonth: fields.promoEndsMonth ?? '' } }, { onSuccess: onClose });
    else add.mutate(fields, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onClose={guardedClose} fullWidth maxWidth="xs">
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
              name="hasPromo"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  label="It has a promotional rate, like a 0% balance transfer"
                />
              )}
            />
            {hasPromo && (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField
                  label="Promotional rate"
                  placeholder="%"
                  {...muiField(register, 'promoApr')}
                  error={!!fieldError('promoApr')}
                  helperText={fieldError('promoApr') ?? 'Often 0.'}
                  slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                />
                <TextField
                  label="Last month at that rate"
                  type="month"
                  {...muiField(register, 'promoEndsMonth')}
                  error={!!fieldError('promoEndsMonth')}
                  helperText={fieldError('promoEndsMonth') ?? 'After it, the APR above applies.'}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: yearMonthFromNow(0), placeholder: 'YYYY-MM, e.g. 2027-06' } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
                  Some store cards charge "deferred interest": miss the deadline and the interest for the whole promotion is added at once.
                  The projection doesn't add that, so aim to clear the balance in time.
                </Typography>
              </Box>
            )}
            {minimumMissesInterest && (
              <Alert severity="warning">
                {hasPromo ? 'Once the promotion ends, this debt charges' : 'This debt charges'} about {formatMoney(interestNow)} of interest a month, so a{' '}
                {formatMoney(minimumNow ?? 0)} payment won't shrink it.
                Check the minimum on your statement, or plan to pay more than {formatMoney(interestNow)}.
              </Alert>
            )}
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
          <Button onClick={guardedClose} color="inherit">
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
