import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { parseMoneyInput, parsePercentInput } from '../../lib/money';
import { useAddGoal, useSaveGoal, type Goal, type GoalFields } from './savings';

const isAmount = (text: string) => parseMoneyInput(text) !== null;
const isOptionalPercent = (text: string) => text.trim() === '' || parsePercentInput(text) !== null;

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  targetAmount: z.string().refine((text) => (parseMoneyInput(text) ?? 0) > 0, 'Enter a target above $0.'),
  currentBalance: z.string().refine(isAmount, 'Enter the balance in dollars.'),
  targetDate: z.string(),
  apy: z.string().refine(isOptionalPercent, 'Enter an APY between 0% and 100%.'),
  sharePercent: z.string().refine(isOptionalPercent, 'Enter a share between 0% and 100%.'),
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', targetAmount: '', currentBalance: '', targetDate: '', apy: '', sharePercent: '' };
const numberText = (value: number) => (value === 0 ? '' : String(value));

interface GoalDialogProps {
  open: boolean;
  /** The goal being edited, or starting values for a new one. */
  goal?: Goal;
  starter?: Partial<GoalFields>;
  /** The share box is only asked for in Percent mode. */
  showShare: boolean;
  onClose: () => void;
}

/** Add a goal, or edit one when `goal` is given. */
export function GoalDialog({ open, goal, starter, showShare, onClose }: GoalDialogProps) {
  const add = useAddGoal();
  const save = useSaveGoal();
  const saving = goal ? save : add;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  // Start from the goal being edited (or the starter values) every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    add.reset();
    save.reset();
    const from = goal ?? starter;
    reset({
      name: from?.name ?? '',
      targetAmount: numberText(from?.targetAmount ?? 0),
      currentBalance: numberText(from?.currentBalance ?? 0),
      targetDate: from?.targetDate ?? '',
      apy: numberText(from?.apy ?? 0),
      sharePercent: numberText(from?.sharePercent ?? 0),
    });
  }, [open, goal, starter]);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const onSubmit = handleSubmit((values) => {
    const fields: GoalFields = {
      name: values.name,
      targetAmount: parseMoneyInput(values.targetAmount) ?? 0,
      currentBalance: parseMoneyInput(values.currentBalance) ?? 0,
      targetDate: values.targetDate || null,
      apy: values.apy.trim() === '' ? 0 : (parsePercentInput(values.apy) ?? 0),
      sharePercent: values.sharePercent.trim() === '' ? 0 : (parsePercentInput(values.sharePercent) ?? 0),
    };
    if (goal) save.mutate({ id: goal.id, goal: fields }, { onSuccess: onClose });
    else add.mutate(fields, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>{goal ? `Edit ${goal.name}` : 'Add a goal'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saving.isError && !hasFieldError && <Alert severity="error">{errorMessage(saving.error)}</Alert>}
            <TextField label="Name" placeholder="Emergency fund, vacation…" autoFocus {...muiField(register, 'name')} error={!!fieldError('name')} helperText={fieldError('name')} />
            <TextField
              label="Target"
              placeholder="$"
              {...muiField(register, 'targetAmount')}
              error={!!fieldError('targetAmount')}
              helperText={fieldError('targetAmount') ?? 'How much you want to have.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Saved so far"
              placeholder="$"
              {...muiField(register, 'currentBalance')}
              error={!!fieldError('currentBalance')}
              helperText={fieldError('currentBalance') ?? 'Update this whenever the real balance changes.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Target date (optional)"
              type="date"
              {...muiField(register, 'targetDate')}
              error={!!fieldError('targetDate')}
              helperText={fieldError('targetDate') ?? "We'll tell you whether you're on track."}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="APY (optional)"
              placeholder="%"
              {...muiField(register, 'apy')}
              error={!!fieldError('apy')}
              helperText={fieldError('apy') ?? 'The yearly interest the account pays, like 4.5.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            {showShare && (
              <TextField
                label="Share of monthly savings"
                placeholder="%"
                {...muiField(register, 'sharePercent')}
                error={!!fieldError('sharePercent')}
                helperText={fieldError('sharePercent') ?? 'Used in Percent mode.'}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving.isPending}>
            {goal ? 'Save changes' : 'Add goal'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
