import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { useGuardedClose } from '../../components/useGuardedClose';
import { ApiError, errorMessage } from '../../api/client';
import { formatMonthFromNow } from '../../lib/dates';
import { formatMoney, moneyInputProblem, moneyInputText, parseMoneyInput } from '../../lib/money';
import { WITHDRAWAL_RATE } from '../../lib/retirement';
import { DashCard } from './cards';
import { useSaveRetirement, type RetirementSettings } from './networth';
import { everydaySpending, retirementOutlook } from './retirementOutlook';
import type { DashboardData } from './useDashboard';

const whole = (value: number) => formatMoney(Math.round(value));

/**
 * The retirement number: 25 times a year of spending in retirement (the 4% rule), and when invested money gets there.
 * In today's dollars whatever the dashboard's switch says, so the number reads as what it buys now.
 */
export function RetirementCard({ data, readOnly }: { data: DashboardData; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const outlook = useMemo(() => retirementOutlook(data, true), [data]);
  const { birthYear, retirementAge } = data.netWorth.settings.retirement;

  const button = (
    <Button size="small" variant="outlined" disabled={readOnly} onClick={() => setEditing(true)}>
      {birthYear === null ? 'Set it up' : 'Change'}
    </Button>
  );

  return (
    <DashCard title="Retirement number">
      {outlook.number <= 0 ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Your number is about 25 times a year of what you'd spend in retirement. Add your everyday categories on{' '}
            <Link component={RouterLink} to="/plan">
              Plan
            </Link>
            , or set the amount yourself.
          </Typography>
          {button}
        </Box>
      ) : (
        <Box>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {whole(outlook.number)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            25 × {whole(outlook.spending * 12)} a year{outlook.fromPlan ? ' (your everyday categories)' : ''}
            {outlook.otherIncome > 0 ? `, less ${whole(outlook.otherIncome * 12)} of other income` : ''}, in today's dollars.
          </Typography>

          <Typography sx={{ mt: 1.5 }} color={outlook.month === null ? 'text.secondary' : 'success.main'}>
            {outlook.month === 0
              ? "Your investments are there already."
              : outlook.month === null
                ? 'Your investments don’t reach it within 40 years on this plan.'
                : `Your investments reach it around ${formatMonthFromNow(outlook.month)}${outlook.age !== null ? `, at about ${outlook.age}` : ''}.`}
          </Typography>
          {outlook.targetMonth !== null && retirementAge !== null && outlook.extraToTarget !== null && outlook.extraToTarget > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              About {formatMoney(outlook.extraToTarget)} more a month invested would get there by {retirementAge}.
            </Typography>
          )}
          {outlook.targetMonth !== null && retirementAge !== null && outlook.extraToTarget === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              On track for {retirementAge}.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
            Based on the {WITHDRAWAL_RATE}% rule of thumb: spending about {WITHDRAWAL_RATE}% of your investments in the first year has usually lasted 30
            years. A guide, not a promise.
          </Typography>
          <Box sx={{ mt: 1.5 }}>{button}</Box>
        </Box>
      )}
      <RetirementDialog open={editing} settings={data.netWorth.settings.retirement} planSpending={everydaySpending(data)} onClose={() => setEditing(false)} />
    </DashCard>
  );
}

const optionalMoney = (text: string) => text.trim() === '' || moneyInputProblem(text) === null;
const optionalWhole = (min: number, max: number) => (text: string) => {
  if (text.trim() === '') return true;
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max;
};

const thisYear = new Date().getFullYear();

const schema = z.object({
  birthYear: z.string().refine(optionalWhole(thisYear - 110, thisYear - 14), `Enter a year between ${thisYear - 110} and ${thisYear - 14}.`),
  retirementAge: z.string().refine(optionalWhole(30, 90), 'Enter an age between 30 and 90.'),
  spendingMonthly: z.string().refine(optionalMoney, 'Enter a monthly amount in dollars.'),
  otherIncomeMonthly: z.string().refine(optionalMoney, 'Enter a monthly amount in dollars.'),
});
type FormValues = z.infer<typeof schema>;

const text = (value: number | null) => (value === null ? '' : String(value));
const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));
const moneyOrNull = (value: string) => (value.trim() === '' ? null : parseMoneyInput(value));

function RetirementDialog({ open, settings, planSpending, onClose }: { open: boolean; settings: RetirementSettings; planSpending: number; onClose: () => void }) {
  const save = useSaveRetirement();
  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    save.reset();
    reset({
      birthYear: text(settings.birthYear),
      retirementAge: text(settings.retirementAge),
      spendingMonthly: settings.spendingMonthly === null ? '' : moneyInputText(settings.spendingMonthly),
      otherIncomeMonthly: settings.otherIncomeMonthly === null ? '' : moneyInputText(settings.otherIncomeMonthly),
    });
  }, [open, settings]);

  const guardedClose = useGuardedClose(open, isDirty, onClose);
  const serverError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      {
        birthYear: numberOrNull(values.birthYear),
        retirementAge: numberOrNull(values.retirementAge),
        spendingMonthly: moneyOrNull(values.spendingMonthly),
        otherIncomeMonthly: moneyOrNull(values.otherIncomeMonthly),
      },
      { onSuccess: onClose },
    ),
  );

  return (
    <Dialog open={open} onClose={guardedClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>Your retirement number</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {save.isError && !serverError?.problem.errors && <Alert severity="error">{errorMessage(save.error)}</Alert>}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '1fr 1fr' } }}>
              <TextField
                label="Year you were born"
                placeholder="1990"
                {...muiField(register, 'birthYear')}
                error={!!fieldError('birthYear')}
                helperText={fieldError('birthYear') ?? 'For your age at each date.'}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <TextField
                label="Retire at (optional)"
                placeholder="65"
                {...muiField(register, 'retirementAge')}
                error={!!fieldError('retirementAge')}
                helperText={
                  fieldError('retirementAge') ??
                  ((watch('retirementAge') ?? '').trim() !== '' && (watch('birthYear') ?? '').trim() === ''
                    ? 'Add the year you were born too, or we can’t tell when that is.'
                    : 'To see if you’re on track.')
                }
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </Box>
            <TextField
              label="Monthly spending in retirement"
              placeholder={formatMoney(planSpending)}
              {...muiField(register, 'spendingMonthly')}
              error={!!fieldError('spendingMonthly')}
              helperText={fieldError('spendingMonthly') ?? `In today's dollars. Leave it empty to use your everyday categories (${formatMoney(planSpending)} a month).`}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Other monthly income then (optional)"
              placeholder="$"
              {...muiField(register, 'otherIncomeMonthly')}
              error={!!fieldError('otherIncomeMonthly')}
              helperText={fieldError('otherIncomeMonthly') ?? 'Social Security or a pension, in today’s dollars. Your estimate is at ssa.gov/myaccount.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={guardedClose} color="inherit">
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
