import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { parseMoneyInput, parsePercentInput } from '../../lib/money';
import { accountTypeLabels, DEFAULT_EXPECTED_RETURN, useAddAccount, useSaveAccount, type Account, type AccountFields, type AccountType } from './investments';

const accountTypes = Object.keys(accountTypeLabels) as [AccountType, ...AccountType[]];
const optionalPercent = (max: number) => (text: string) => text.trim() === '' || parsePercentInput(text, max) !== null;

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  type: z.enum(accountTypes),
  balance: z.string().refine((text) => parseMoneyInput(text) !== null, 'Enter the balance in dollars.'),
  expectedReturn: z.string().refine(optionalPercent(50), 'Enter a yearly return between 0% and 50%.'),
  matchPercent: z.string().refine(optionalPercent(500), 'Enter a match between 0% and 500%.'),
  matchLimitPercent: z.string().refine(optionalPercent(100), 'Enter a limit between 0% and 100%.'),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', type: 'Retirement401k', balance: '', expectedReturn: String(DEFAULT_EXPECTED_RETURN), matchPercent: '', matchLimitPercent: '' };
const optionalNumber = (text: string, max: number) => (text.trim() === '' ? null : parsePercentInput(text, max));

/** Add an account, or edit one when `account` is given. Shares are changed in the split dialog. */
export function AccountDialog({ open, account, onClose }: { open: boolean; account?: Account; onClose: () => void }) {
  const add = useAddAccount();
  const save = useSaveAccount();
  const saving = account ? save : add;

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  // Start from the account being edited (or a blank form) every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    add.reset();
    save.reset();
    reset(
      account
        ? {
            name: account.name,
            type: account.type,
            balance: account.balance === 0 ? '' : String(account.balance),
            expectedReturn: String(account.expectedReturn),
            matchPercent: account.matchPercent === null ? '' : String(account.matchPercent),
            matchLimitPercent: account.matchLimitPercent === null ? '' : String(account.matchLimitPercent),
          }
        : blank,
    );
  }, [open, account]);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const onSubmit = handleSubmit((values) => {
    const fields: AccountFields = {
      name: values.name,
      type: values.type,
      balance: parseMoneyInput(values.balance) ?? 0,
      expectedReturn: optionalNumber(values.expectedReturn, 50) ?? DEFAULT_EXPECTED_RETURN,
      matchPercent: optionalNumber(values.matchPercent, 500),
      matchLimitPercent: optionalNumber(values.matchLimitPercent, 100),
    };
    if (account) save.mutate({ id: account.id, account: fields }, { onSuccess: onClose });
    else add.mutate(fields, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>{account ? `Edit ${account.name}` : 'Add an account'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saving.isError && !hasFieldError && <Alert severity="error">{errorMessage(saving.error)}</Alert>}
            <TextField label="Name" placeholder="Work 401(k), Roth IRA…" autoFocus {...muiField(register, 'name')} error={!!fieldError('name')} helperText={fieldError('name')} />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField select label="Type" {...field} error={!!fieldError('type')} helperText={fieldError('type')}>
                  {accountTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {accountTypeLabels[type]}
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
              helperText={fieldError('balance') ?? 'What it is worth today. Update this whenever you check it.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Expected yearly return"
              placeholder="%"
              {...muiField(register, 'expectedReturn')}
              error={!!fieldError('expectedReturn')}
              helperText={fieldError('expectedReturn') ?? `An assumption, not a promise. ${DEFAULT_EXPECTED_RETURN}% is a common long-run figure for stocks.`}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />

            <Typography variant="subtitle2" sx={{ pt: 1 }}>
              Employer match (optional)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Match"
                placeholder="%"
                {...muiField(register, 'matchPercent')}
                error={!!fieldError('matchPercent')}
                helperText={fieldError('matchPercent') ?? 'Of what you put in.'}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              <TextField
                label="Up to"
                placeholder="% of income"
                {...muiField(register, 'matchLimitPercent')}
                error={!!fieldError('matchLimitPercent')}
                helperText={fieldError('matchLimitPercent') ?? 'Of your monthly income.'}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              "50% match up to 6%" means: Match 50, Up to 6.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving.isPending}>
            {account ? 'Save changes' : 'Add account'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
