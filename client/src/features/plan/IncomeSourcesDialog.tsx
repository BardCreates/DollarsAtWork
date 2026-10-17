import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { incomeFrequencies, monthlyEquivalent, type IncomeFrequency } from '../../lib/income';
import { formatMoney, moneyInputProblem, parseMoneyInput } from '../../lib/money';
import { useAddIncomeSource, useDeleteIncomeSource, useIncomes, useSaveIncomeSource, type IncomeSource } from './incomes';

const frequencyValues = incomeFrequencies.map((f) => f.value) as [IncomeFrequency, ...IncomeFrequency[]];
const labelOf = (frequency: IncomeFrequency) => incomeFrequencies.find((f) => f.value === frequency)?.label ?? frequency;

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  amount: z.string().superRefine((text, ctx) => {
    const problem = moneyInputProblem(text);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  }),
  frequency: z.enum(frequencyValues),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', amount: '', frequency: 'Biweekly' };

/**
 * Income from more than one place (two jobs, a partner's pay) or on a schedule other than monthly. The plan's
 * income becomes the sources' average month added up.
 */
export function IncomeSourcesDialog({ open, readOnly, currentIncome, onClose }: { open: boolean; readOnly: boolean; currentIncome: number; onClose: () => void }) {
  const { data } = useIncomes();
  const add = useAddIncomeSource();
  const save = useSaveIncomeSource();
  const remove = useDeleteIncomeSource();
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const saving = editing ? save : add;

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank });

  useEffect(() => {
    if (!open) return;
    setEditing(null);
    add.reset();
    save.reset();
    remove.reset();
    reset(blank);
  }, [open]);

  const startEdit = (source: IncomeSource) => {
    setEditing(source);
    reset({ name: source.name, amount: String(source.amount), frequency: source.frequency });
  };

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const preview = parseMoneyInput(watch('amount'));
  const frequency = watch('frequency');
  const amountLabel = incomeFrequencies.find((f) => f.value === frequency)?.amountLabel ?? 'Amount';

  const onSubmit = handleSubmit((values) => {
    const source = { name: values.name, amount: parseMoneyInput(values.amount) ?? 0, frequency: values.frequency };
    const done = () => {
      setEditing(null);
      reset(blank);
    };
    if (editing) save.mutate({ id: editing.id, source }, { onSuccess: done });
    else add.mutate(source, { onSuccess: done });
  });

  const sources = data?.sources ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Income sources</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Add each paycheck or other income, after taxes. Your plan's monthly income becomes their average month added up. Pay that varies? Enter a careful,
          lower-than-usual month, and treat anything extra as one-time money.
        </Typography>

        {sources.length > 0 && (
          <Box sx={{ borderTop: 1, borderColor: 'divider', mb: 2 }}>
            {sources.map((source) => (
              <Box
                key={source.id}
                sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {source.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatMoney(source.amount)} · {labelOf(source.frequency).toLowerCase()} · about {formatMoney(Math.round(source.monthlyAmount))} a month
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title="Edit">
                    <span>
                      <IconButton size="small" aria-label={`Edit ${source.name}`} disabled={readOnly} onClick={() => startEdit(source)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <span>
                      <IconButton size="small" aria-label={`Delete ${source.name}`} disabled={readOnly || remove.isPending} onClick={() => remove.mutate(source.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ))}
            <Typography sx={{ pt: 1, fontWeight: 600 }}>Monthly income: {formatMoney(data?.monthlyIncome ?? currentIncome)}</Typography>
          </Box>
        )}
        {remove.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage(remove.error)}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} noValidate>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {editing ? `Edit ${editing.name}` : sources.length === 0 ? 'Your first source' : 'Add another'}
          </Typography>
          <Stack spacing={2}>
            {saving.isError && !serverError?.problem.errors && <Alert severity="error">{errorMessage(saving.error)}</Alert>}
            <TextField label="Name" placeholder="My paycheck, partner's job, freelance…" size="small" {...muiField(register, 'name')} error={!!fieldError('name')} helperText={fieldError('name')} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <TextField select size="small" label="How often" {...field} error={!!fieldError('frequency')} helperText={fieldError('frequency')}>
                    {incomeFrequencies.map((f) => (
                      <MenuItem key={f.value} value={f.value}>
                        {f.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label={amountLabel}
                placeholder="$ after taxes"
                size="small"
                {...muiField(register, 'amount')}
                error={!!fieldError('amount')}
                helperText={fieldError('amount') ?? (preview ? `About ${formatMoney(Math.round(monthlyEquivalent(preview, frequency)))} a month` : undefined)}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            </Box>
            {frequency === 'Biweekly' && (
              <Typography variant="caption" color="text.secondary">
                26 paychecks a year means two months with a third one. Your plan uses the average month; or plan on two a month and add the extra paychecks as
                one-time money.
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained" disabled={readOnly || saving.isPending}>
                {editing ? 'Save changes' : 'Add'}
              </Button>
              {editing && (
                <Button
                  color="inherit"
                  onClick={() => {
                    setEditing(null);
                    reset(blank);
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
