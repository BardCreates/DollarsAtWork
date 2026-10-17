import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { parsePercentInput } from '../../lib/money';
import { destinationLabels, useSaveSettings, type Destination, type Settings } from './networth';

const MAX_RATE = 20;
const isRate = (text: string) => parsePercentInput(text, MAX_RATE) !== null;

const schema = z.object({
  inflationRate: z.string().refine(isRate, `Enter a rate between 0% and ${MAX_RATE}%.`),
  incomeGrowthRate: z.string().refine(isRate, `Enter a rate between 0% and ${MAX_RATE}%.`),
  debtDoneDestination: z.enum(['Investments', 'Savings', 'Remaining']),
  savingsDoneDestination: z.enum(['Investments', 'Debt', 'Remaining']),
  raiseToInvestments: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const debtChoices: Destination[] = ['Investments', 'Savings', 'Remaining'];
const savingsChoices: Destination[] = ['Investments', 'Debt', 'Remaining'];

/** The assumptions behind the projection: inflation, raises, and where finished money goes next. */
export function AssumptionsDialog({ open, settings, onClose }: { open: boolean; settings: Settings; onClose: () => void }) {
  const save = useSaveSettings();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset({
      inflationRate: String(settings.inflationRate),
      incomeGrowthRate: String(settings.incomeGrowthRate),
      debtDoneDestination: settings.debtDoneDestination as FormValues['debtDoneDestination'],
      savingsDoneDestination: settings.savingsDoneDestination as FormValues['savingsDoneDestination'],
      raiseToInvestments: settings.raiseToInvestments,
    });
  }, [open, settings]);

  const serverError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      {
        inflationRate: parsePercentInput(values.inflationRate, MAX_RATE) ?? 0,
        incomeGrowthRate: parsePercentInput(values.incomeGrowthRate, MAX_RATE) ?? 0,
        debtDoneDestination: values.debtDoneDestination,
        savingsDoneDestination: values.savingsDoneDestination,
        raiseToInvestments: values.raiseToInvestments,
      },
      { onSuccess: onClose },
    ),
  );

  const destination = (name: 'debtDoneDestination' | 'savingsDoneDestination', label: string, choices: Destination[]) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField select label={label} {...field} value={field.value ?? ''} error={!!fieldError(name)} helperText={fieldError(name)}>
          {choices.map((choice) => (
            <MenuItem key={choice} value={choice}>
              {destinationLabels[choice]}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>Projection assumptions</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {save.isError && !serverError?.problem.errors && <Alert severity="error">{errorMessage(save.error)}</Alert>}
            <Typography variant="subtitle2">When a job is finished</Typography>
            {destination('debtDoneDestination', 'Once all debt is paid, that money goes to', debtChoices)}
            {destination('savingsDoneDestination', 'Once all goals are full, that money goes to', savingsChoices)}

            <Typography variant="subtitle2" sx={{ pt: 1 }}>
              Rates
            </Typography>
            <TextField
              label="Inflation"
              placeholder="%"
              {...muiField(register, 'inflationRate')}
              error={!!fieldError('inflationRate')}
              helperText={fieldError('inflationRate') ?? "Used when you switch on today's dollars."}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Yearly raise"
              placeholder="%"
              {...muiField(register, 'incomeGrowthRate')}
              error={!!fieldError('incomeGrowthRate')}
              helperText={fieldError('incomeGrowthRate') ?? 'How much your pay grows each year. It also lifts any employer-match cap.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <Controller
              name="raiseToInvestments"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(_, checked) => field.onChange(checked)} />}
                    label="Invest each raise"
                  />
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ pl: 0.5 }}>
                    On: every raise is added to your Investments amount, so what you invest grows with your pay. Off: the extra lands in
                    Remaining, where it isn't projected until you give it a job.
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
          <Button type="submit" variant="contained" disabled={save.isPending}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
