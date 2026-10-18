import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Step, StepLabel, Stepper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import mascot from '../../assets/mascot.png';
import { MoneyField } from '../../components/MoneyField';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatMoney } from '../../lib/money';
import { project } from '../../lib/projection';
import { buildProjectionInput, useDashboardData } from '../dashboard/useDashboard';
import { DebtDialog } from '../debt/DebtDialog';
import { useDebts } from '../debt/debts';
import { AccountDialog } from '../invest/AccountDialog';
import { AssetDialog } from '../assets/AssetDialog';
import { useNetWorth } from '../dashboard/networth';
import { useInvestments } from '../invest/investments';
import { AddCategoryForm } from '../plan/AddCategoryForm';
import { IncomeBox } from '../plan/IncomeBox';
import { planTotals, usePlan, useSetModuleAmount, useUpdateCategory, useUpdateIncome, type Category, type CategoryKind, type Plan } from '../plan/plan';
import { GoalDialog } from '../savings/GoalDialog';
import { useSavings } from '../savings/savings';

const steps = ['Income', 'Everyday spending', 'Debts', 'Monthly amounts', 'What you have'];

/**
 * Your own 10-year number, live: net worth in 10 years from whatever has been entered so far.
 * It's the reason to finish the walkthrough, so it stays in view from the first step.
 */
function TenYearNumber() {
  const { data } = useDashboardData();
  const worth = useMemo(() => (data ? project(buildProjectionInput(data, true)).points[120].netWorth : null), [data]);

  const nothingYet =
    !!data &&
    data.plan.monthlyIncome === 0 &&
    data.plan.categories.every((c) => c.amount === 0) &&
    data.debts.debts.length === 0 &&
    data.savings.goals.length === 0 &&
    data.investments.accounts.length === 0;

  return (
    <Card sx={{ mb: 3, outline: 1, outlineStyle: 'solid', outlineColor: 'primary.main' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Your net worth in 10 years
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {nothingYet ? 'Add your income and this number appears.' : "In today's dollars, from what you've entered so far. It updates as you go."}
          </Typography>
        </Box>
        <Typography
          role="status"
          aria-live="polite"
          variant="h5"
          component="p"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: worth !== null && worth < 0 ? 'error.main' : 'success.main' }}
        >
          {worth === null || nothingYet ? '—' : formatMoney(Math.round(worth))}
        </Typography>
      </CardContent>
    </Card>
  );
}

const builtInHelp: Record<Exclude<CategoryKind, 'Custom'>, string> = {
  Savings: 'Money for goals like an emergency fund or a trip.',
  Debt: 'Everything you pay toward cards and loans each month, minimums included. Anything above the minimums pays them off sooner.',
  Investment: "Retirement and brokerage money you put in yourself. Leave out what's already taken from your paycheck; add that to the account instead.",
};

/** A built-in amount: saved through the plan's category, so its module page shows the new amount straight away. */
function ModuleAmount({ category, income, readOnly }: { category: Category; income: number; readOnly: boolean }) {
  const kind = category.kind as Exclude<CategoryKind, 'Custom'>;
  const module = useSetModuleAmount(kind);
  return (
    <AmountRow name={category.name} help={builtInHelp[kind]}>
      <MoneyField value={category.amount} percentOf={income} ariaLabel={`${category.name} amount`} disabled={readOnly} onCommit={module.set} />
    </AmountRow>
  );
}

function AmountRow({ name, help, children }: { name: string; help?: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5, alignItems: 'center', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) 180px' } }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
        {help && (
          <Typography variant="body2" color="text.secondary">
            {help}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

const everydayHelp: Record<string, string> = {
  Housing: "Rent, or with a mortgage just property tax, insurance and HOA: the loan payment goes in the next step, so it isn't counted twice.",
  Groceries: 'Food and household basics.',
  Utilities: 'Power, water, gas, phone and internet.',
  Transportation: 'Gas, transit, insurance and upkeep. A car loan goes in the next step.',
};

function RemainingLine({ plan }: { plan: Plan }) {
  const { remaining } = planTotals(plan);
  return (
    <Typography sx={{ mt: 3 }} color={remaining < 0 ? 'error.main' : 'text.secondary'}>
      {remaining < 0
        ? `That's ${formatMoney(-remaining)} more than your income.`
        : `${formatMoney(remaining)} of your ${formatMoney(plan.monthlyIncome)} is still unassigned.`}
    </Typography>
  );
}

/**
 * First-run walkthrough: income, everyday spending, debts, then the three built-in amounts (Debt starts at the
 * debts' minimums), then an optional goal, account and home. The step lives in the address (?step=2), so refresh
 * and the browser's Back button keep your place.
 */
export function WelcomePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: me } = useMe();
  const plan = usePlan();
  const debts = useDebts();
  const savings = useSavings();
  const investments = useInvestments();
  const netWorth = useNetWorth();
  const updateCategory = useUpdateCategory();
  const debtAmount = useSetModuleAmount('Debt');

  const stepFromUrl = Number(params.get('step'));
  const step = Number.isInteger(stepFromUrl) && stepFromUrl >= 1 && stepFromUrl <= steps.length ? stepFromUrl - 1 : 0;
  const goTo = (next: number) => setParams(next === 0 ? {} : { step: String(next + 1) });

  const [adding, setAdding] = useState<'debt' | 'goal' | 'account' | 'asset' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (e: unknown) => setProblem(errorMessage(e));

  // Reaching the amounts step (by Next, Skip, Back/Forward or a link): start the Debt amount at the debts' minimums,
  // so the plan covers them from day one. Again whenever the minimums change (a debt added after going back), and
  // only ever raising it, so a lower amount chosen on purpose for the same debts stays.
  const prefilledFor = useRef<number | null>(null);
  const canEdit = !!me?.access.hasFullAccess;
  const minimumsDue = (debts.data?.debts ?? []).filter((d) => d.balance > 0).reduce((sum, d) => sum + d.minPayment, 0);
  const debtNow = debtAmount.category?.amount;
  useEffect(() => {
    if (step < 3 || !canEdit || !debts.data || debtNow === undefined || prefilledFor.current === minimumsDue) return;
    prefilledFor.current = minimumsDue;
    if (minimumsDue > 0 && debtNow < minimumsDue) debtAmount.set(minimumsDue, (e) => setProblem(errorMessage(e)));
  }, [step, canEdit, debts.data, debtNow, minimumsDue, debtAmount]);

  if (plan.isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (plan.isError) {
    return (
      <Alert severity="error" action={<Button color="inherit" onClick={() => plan.refetch()}>Retry</Button>}>
        {errorMessage(plan.error)}
      </Alert>
    );
  }

  const readOnly = !me?.access.hasFullAccess;
  const income = plan.data.monthlyIncome;
  const builtIns = plan.data.categories.filter((c) => c.isBuiltIn);
  const everyday = plan.data.categories.filter((c) => !c.isBuiltIn);
  const last = step === steps.length - 1;
  const debtList = debts.data?.debts ?? [];
  const minimums = debtList.filter((d) => d.balance > 0).reduce((sum, d) => sum + d.minPayment, 0);

  const next = () => {
    if (last) {
      navigate('/');
      return;
    }
    goTo(step + 1);
  };

  const extras = [
    { key: 'goal' as const, title: 'A savings goal', about: 'Something to save for, like an emergency fund.', count: savings.data?.goals.length ?? 0 },
    { key: 'account' as const, title: 'An investment account', about: 'A 401(k), IRA or brokerage account.', count: investments.data?.accounts.length ?? 0 },
    { key: 'asset' as const, title: 'A home or car', about: 'Something you own, at what it would sell for today.', count: netWorth.data?.items.length ?? 0 },
  ];

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 72, height: 'auto', flexShrink: 0 }} />
        <Box>
          <Typography variant="h4" component="h1">
            Let's set up your plan
          </Typography>
          <Typography color="text.secondary">Five quick steps. You can change everything later.</Typography>
        </Box>
      </Box>

      <TenYearNumber />

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, '& .MuiStepLabel-label': { fontSize: { xs: '0.7rem', sm: '0.875rem' } } }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {readOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Editing is turned off until you subscribe. You can still look around.
        </Alert>
      )}
      {problem && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          {step === 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                What do you take home each month?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Your pay after taxes and anything taken out for a 401(k). If it varies, use a careful, lower-than-usual month.
              </Typography>
              <Box sx={{ maxWidth: 320 }}>
                <IncomeField income={income} readOnly={readOnly} onError={onError} />
              </Box>
            </>
          )}

          {step === 1 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                What do the basics cost each month?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                A rough number is fine. Rename, add or delete categories here or on the Plan page later.
              </Typography>
              <Box sx={{ display: 'grid', gap: 2.5 }}>
                {everyday.map((category) => (
                  <AmountRow key={category.id} name={category.name} help={everydayHelp[category.name]}>
                    <MoneyField
                      value={category.amount}
                      percentOf={income}
                      ariaLabel={`${category.name} amount`}
                      disabled={readOnly}
                      onCommit={(amount) => updateCategory.mutate({ id: category.id, changes: { amount } }, { onError })}
                    />
                  </AmountRow>
                ))}
              </Box>
              <AddCategoryForm categories={plan.data.categories} income={income} disabled={readOnly} />
              <RemainingLine plan={plan.data} />
            </>
          )}

          {step === 2 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Do you owe anything?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Cards, car or student loans, a mortgage. Add each one with its minimum payment, or skip this if you're debt-free.
              </Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {debtList.map((debt) => (
                  <Box key={debt.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
                      {debt.name}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {formatMoney(debt.balance)} · {formatMoney(debt.minPayment)}/month
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Button variant="outlined" sx={{ mt: debtList.length > 0 ? 2 : 0 }} disabled={readOnly} onClick={() => setAdding('debt')}>
                {debtList.length > 0 ? 'Add another debt' : 'Add a debt'}
              </Button>
              {minimums > 0 && (
                <Typography sx={{ mt: 3 }} color="text.secondary">
                  Your minimums add up to {formatMoney(minimums)} a month. Next, your Debt amount starts there.
                </Typography>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                How much goes to each of these every month?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Type dollars or a percent of income, like 10%. Leave any at $0 for now.
              </Typography>
              <Box sx={{ display: 'grid', gap: 2.5 }}>
                {builtIns.map((category) => (
                  <ModuleAmount key={category.id} category={category} income={income} readOnly={readOnly} />
                ))}
              </Box>
              {minimums > 0 && (debtAmount.category?.amount ?? 0) < minimums && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Your debts' minimums are {formatMoney(minimums)} a month, more than the Debt amount.
                </Alert>
              )}
              <RemainingLine plan={plan.data} />
            </>
          )}

          {step === 4 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Add what you have
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Optional, and the more you add, the truer your net worth. Add one of each now or skip and do it later.
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {extras.map((extra) => (
                  <Box key={extra.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {extra.title}
                        {extra.count > 0 && <CheckCircleIcon color="success" fontSize="small" aria-label="Added" />}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {extra.count > 0 ? `${extra.count} added.` : extra.about}
                      </Typography>
                    </Box>
                    <Button variant="outlined" disabled={readOnly} onClick={() => setAdding(extra.key)}>
                      {extra.count > 0 ? 'Add another' : 'Add'}
                    </Button>
                  </Box>
                ))}
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
            <Button color="inherit" disabled={step === 0} onClick={() => goTo(step - 1)}>
              Back
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!last && (
                <Button color="inherit" onClick={() => navigate('/')}>
                  Skip for now
                </Button>
              )}
              <Button variant="contained" onClick={next}>
                {last ? 'See my dashboard' : 'Next'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <DebtDialog open={adding === 'debt'} onClose={() => setAdding(null)} />
      <GoalDialog open={adding === 'goal'} showShare={false} onClose={() => setAdding(null)} />
      <AccountDialog open={adding === 'account'} onClose={() => setAdding(null)} />
      <AssetDialog open={adding === 'asset'} onClose={() => setAdding(null)} />
    </Box>
  );
}

function IncomeField({ income, readOnly, onError }: { income: number; readOnly: boolean; onError: (e: unknown) => void }) {
  const updateIncome = useUpdateIncome();
  return <IncomeBox income={income} readOnly={readOnly} onCommit={(value) => updateIncome.mutate(value, { onError })} />;
}
