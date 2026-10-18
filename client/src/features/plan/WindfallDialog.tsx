import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { useGuardedClose } from '../../components/useGuardedClose';
import { ApiError, errorMessage } from '../../api/client';
import { yearMonthFromNow } from '../../lib/dates';
import { moneyInputProblem, parseMoneyInput } from '../../lib/money';
import {
  useAddWindfall,
  useSaveWindfall,
  windfallDestinationLabels,
  type Windfall,
  type WindfallDestination,
  type WindfallFields,
} from '../dashboard/networth';

const destinations = Object.keys(windfallDestinationLabels) as [WindfallDestination, ...WindfallDestination[]];

const destinationHelp: Record<WindfallDestination, string> = {
  Debt: 'An extra payment that month, to the debt your payoff order is working on (a minimum-only mortgage doesn’t get extra).',
  Savings: 'Shared among your goals the way your monthly savings are.',
  Investments: 'Added to your investing that month, by your accounts’ split.',
};

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  amount: z.string().superRefine((text, ctx) => {
    const problem = moneyInputProblem(text);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    else if ((parseMoneyInput(text) ?? 0) <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter an amount above $0.' });
  }),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Pick the month the money arrives, like 2027-03.'),
  destination: z.enum(destinations),
});
type FormValues = z.infer<typeof schema>;

const blank = (): FormValues => ({ name: '', amount: '', month: yearMonthFromNow(1), destination: 'Debt' });

/** Add one-time money, or edit it when `windfall` is given. */
export function WindfallDialog({ open, windfall, onClose }: { open: boolean; windfall?: Windfall; onClose: () => void }) {
  const add = useAddWindfall();
  const save = useSaveWindfall();
  const saving = windfall ? save : add;

  const { register, control, handleSubmit, reset, setError, watch, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank(),
  });

  useEffect(() => {
    if (!open) return;
    add.reset();
    save.reset();
    reset(windfall ? { name: windfall.name, amount: String(windfall.amount), month: windfall.month, destination: windfall.destination } : blank());
  }, [open, windfall]);

  const guardedClose = useGuardedClose(open, isDirty, onClose);
  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (['name', 'amount', 'month', 'destination'] as const).some((field) => fieldError(field));
  const thisMonth = yearMonthFromNow(0);

  const onSubmit = handleSubmit((values) => {
    // An existing one keeps its month even after it has gone by; a new or moved one has to be ahead.
    if (values.month < thisMonth && values.month !== windfall?.month) {
      setError('month', { message: 'That month has passed. Pick this month or a later one.' });
      return;
    }
    const fields: WindfallFields = {
      name: values.name,
      amount: parseMoneyInput(values.amount) ?? 0,
      month: values.month,
      destination: values.destination,
    };
    if (windfall) save.mutate({ id: windfall.id, windfall: fields }, { onSuccess: onClose });
    else add.mutate(fields, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onClose={guardedClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>{windfall ? `Edit ${windfall.name}` : 'Add one-time money'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saving.isError && !hasFieldError && <Alert severity="error">{errorMessage(saving.error)}</Alert>}
            <TextField label="Name" placeholder="Tax refund, bonus…" autoFocus {...muiField(register, 'name')} error={!!fieldError('name')} helperText={fieldError('name')} />
            <TextField
              label="Amount"
              placeholder="$"
              {...muiField(register, 'amount')}
              error={!!fieldError('amount')}
              helperText={fieldError('amount') ?? 'What you expect to have to put to work, after any tax on it.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Month it arrives"
              type="month"
              {...muiField(register, 'month')}
              error={!!fieldError('month')}
              helperText={fieldError('month') ?? 'A best guess is fine. Move it if it comes early or late.'}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: thisMonth, placeholder: 'YYYY-MM, e.g. 2027-03' } }}
            />
            <Controller
              name="destination"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Goes to"
                  {...field}
                  error={!!fieldError('destination')}
                  helperText={fieldError('destination') ?? destinationHelp[watch('destination')]}
                >
                  {destinations.map((destination) => (
                    <MenuItem key={destination} value={destination}>
                      {windfallDestinationLabels[destination]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={guardedClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving.isPending}>
            {windfall ? 'Save changes' : 'Add'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
