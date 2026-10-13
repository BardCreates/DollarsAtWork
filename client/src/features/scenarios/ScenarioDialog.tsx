import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';
import { ApiError, errorMessage } from '../../api/client';
import { formatMoney, parseMoneyInput, parsePercentInput } from '../../lib/money';
import { changesBetween, isEmptyChanges, resolveScenario, type ScenarioInputs } from '../../lib/scenarios';
import { strategyInfo, type DebtStrategy } from '../debt/debts';
import type { DashboardData } from '../dashboard/useDashboard';
import { baseInputs, useAddScenario, useSaveScenario, type Scenario } from './scenarios';

const MAX_RAISE = 20;

const debtChoices = ['Investments', 'Savings', 'Remaining'] as const;
const savingsChoices = ['Investments', 'Debt', 'Remaining'] as const;
const choiceLabels: Record<string, string> = {
  Investments: 'Investments',
  Savings: 'Savings goals',
  Debt: 'Debt payoff',
  Remaining: 'Back to Remaining (not projected)',
};

interface Draft {
  name: string;
  income: string;
  amounts: Record<string, string>;
  raise: string;
  strategy: string;
  debtDone: string;
  savingsDone: string;
}

function toDraft(name: string, inputs: ScenarioInputs): Draft {
  return {
    name,
    income: String(inputs.monthlyIncome),
    amounts: Object.fromEntries(Object.entries(inputs.categoryAmounts).map(([id, amount]) => [id, String(amount)])),
    raise: String(inputs.incomeGrowthRate),
    strategy: inputs.debtStrategy,
    debtDone: inputs.debtDoneDestination,
    savingsDone: inputs.savingsDoneDestination,
  };
}

/** A draft as numbers, or null if anything in it isn't a usable amount. */
function parseDraft(draft: Draft): ScenarioInputs | null {
  const income = parseMoneyInput(draft.income);
  const raise = parsePercentInput(draft.raise, MAX_RAISE);
  if (income === null || raise === null) return null;

  const categoryAmounts: Record<string, number> = {};
  for (const [id, text] of Object.entries(draft.amounts)) {
    const amount = parseMoneyInput(text, income);
    if (amount === null) return null;
    categoryAmounts[id] = amount;
  }
  return { monthlyIncome: income, categoryAmounts, incomeGrowthRate: raise, debtStrategy: draft.strategy, debtDoneDestination: draft.debtDone, savingsDoneDestination: draft.savingsDone };
}

interface ScenarioDialogProps {
  open: boolean;
  /** The scenario being edited, or undefined to start a new one from the real plan. */
  scenario?: Scenario;
  data: DashboardData;
  onClose: () => void;
}

/**
 * Edit a what-if: change the income, any category, the raise, the payoff order or where finished money goes.
 * Only the differences from the real plan are saved. Plain controlled inputs: the fields are the plan's own categories.
 */
export function ScenarioDialog({ open, scenario, data, onClose }: ScenarioDialogProps) {
  const add = useAddScenario();
  const save = useSaveScenario();
  const saving = scenario ? save : add;

  const base = useMemo(() => baseInputs(data), [data]);
  const [draft, setDraft] = useState<Draft>(() => toDraft('', base));

  useEffect(() => {
    if (!open) return;
    add.reset();
    save.reset();
    setDraft(toDraft(scenario?.name ?? '', scenario ? resolveScenario(base, scenario.overrides) : base));
  }, [open, scenario]);

  const parsed = parseDraft(draft);
  const changes = parsed ? changesBetween(base, parsed) : {};
  const remaining = parsed ? parsed.monthlyIncome - Object.values(parsed.categoryAmounts).reduce((sum, amount) => sum + amount, 0) : null;
  const nameOk = draft.name.trim().length > 0;
  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const nameError = serverError?.fieldErrors('name')[0];

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const setAmount = (id: string, text: string) => setDraft((current) => ({ ...current, amounts: { ...current.amounts, [id]: text } }));

  const onSave = () => {
    if (!parsed || !nameOk) return;
    const scenarioToSave = { name: draft.name.trim(), overrides: changes };
    if (scenario) save.mutate({ id: scenario.id, scenario: scenarioToSave }, { onSuccess: onClose });
    else add.mutate(scenarioToSave, { onSuccess: onClose });
  };

  const amountField = (label: string, value: string, onChange: (text: string) => void, planValue: number, key: string) => {
    const valid = parseMoneyInput(value, parsed?.monthlyIncome ?? base.monthlyIncome) !== null;
    const changed = valid && Math.abs((parseMoneyInput(value, parsed?.monthlyIncome ?? base.monthlyIncome) ?? 0) - planValue) > 0.005;
    return (
      <Box key={key} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px', gap: 1.5, alignItems: 'center' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap>{label}</Typography>
          <Typography variant="caption" color={changed ? 'primary.main' : 'text.secondary'}>
            {changed ? `Plan: ${formatMoney(planValue)}` : 'Same as your plan'}
          </Typography>
        </Box>
        <TextField
          size="small"
          value={value}
          error={!valid}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.target.select()}
          slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': label, style: { textAlign: 'right' } } }}
        />
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{scenario ? `Edit ${scenario.name}` : 'New what-if'}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Change anything below to see what it does to your future. Your real plan isn't touched.
        </Typography>

        {saving.isError && !nameError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage(saving.error)}
          </Alert>
        )}

        <TextField
          label="Name"
          placeholder="What if I cut dining out?"
          autoFocus
          value={draft.name}
          onChange={(event) => set({ name: event.target.value })}
          error={!!nameError}
          helperText={nameError}
          slotProps={{ htmlInput: { maxLength: 60 } }}
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Income and categories
        </Typography>
        <Box sx={{ display: 'grid', gap: 1.5, mb: 1 }}>
          {amountField('Monthly take-home income', draft.income, (text) => set({ income: text }), base.monthlyIncome, 'income')}
          {data.plan.categories.map((category) =>
            amountField(category.name, draft.amounts[category.id] ?? '', (text) => setAmount(category.id, text), base.categoryAmounts[category.id], category.id),
          )}
        </Box>
        {remaining !== null && (
          <Typography variant="body2" color={remaining < 0 ? 'error.main' : 'text.secondary'} sx={{ mb: 3 }}>
            {remaining < 0 ? `Over-allocated by ${formatMoney(-remaining)}.` : `${formatMoney(remaining)} left over each month.`}
          </Typography>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Assumptions
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            label="Yearly raise"
            value={draft.raise}
            error={parsePercentInput(draft.raise, MAX_RAISE) === null}
            helperText={parsePercentInput(draft.raise, MAX_RAISE) === null ? `Enter 0 to ${MAX_RAISE}.` : `Plan: ${base.incomeGrowthRate}%`}
            onChange={(event) => set({ raise: event.target.value })}
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
          />
          <TextField select label="Pay debts off by" value={draft.strategy} onChange={(event) => set({ strategy: event.target.value })}>
            {(Object.keys(strategyInfo) as DebtStrategy[]).map((strategy) => (
              <MenuItem key={strategy} value={strategy}>
                {strategyInfo[strategy].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Once debt is gone, that money goes to" value={draft.debtDone} onChange={(event) => set({ debtDone: event.target.value })}>
            {debtChoices.map((choice) => (
              <MenuItem key={choice} value={choice}>
                {choiceLabels[choice]}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Once goals are full, that money goes to" value={draft.savingsDone} onChange={(event) => set({ savingsDone: event.target.value })}>
            {savingsChoices.map((choice) => (
              <MenuItem key={choice} value={choice}>
                {choiceLabels[choice]}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {parsed && isEmptyChanges(changes) && (
          <Alert severity="info" sx={{ mt: 3 }}>
            This matches your current plan so far. Change something to see a difference.
          </Alert>
        )}
        {!parsed && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            One of the amounts isn't a number. Fix the box outlined in red to save.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!parsed || !nameOk || saving.isPending} onClick={onSave}>
          {scenario ? 'Save changes' : 'Save what-if'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
