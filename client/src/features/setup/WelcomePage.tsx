import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Step, StepLabel, Stepper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import mascot from '../../assets/mascot.png';
import { MoneyField } from '../../components/MoneyField';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatMoney } from '../../lib/money';
import { DebtDialog } from '../debt/DebtDialog';
import { useDebts } from '../debt/debts';
import { AccountDialog } from '../invest/AccountDialog';
import { useInvestments } from '../invest/investments';
import { planTotals, usePlan, useUpdateCategory, useUpdateIncome, type Category } from '../plan/plan';
import { GoalDialog } from '../savings/GoalDialog';
import { useSavings } from '../savings/savings';

const steps = ['Your income', 'Savings, debt and investing', 'What you have and owe'];

const builtInHelp: Record<string, string> = {
  Savings: 'Money for goals like an emergency fund or a trip.',
  Debt: 'Everything you pay toward cards and loans each month, minimums included.',
  Investment: 'Retirement and brokerage contributions.',
};

/** First-run walkthrough: income, the three built-in amounts, then an optional first debt, goal and account. */
export function WelcomePage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const plan = usePlan();
  const debts = useDebts();
  const savings = useSavings();
  const investments = useInvestments();
  const updateIncome = useUpdateIncome();
  const updateCategory = useUpdateCategory();

  const [step, setStep] = useState(0);
  const [adding, setAdding] = useState<'debt' | 'goal' | 'account' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (e: unknown) => setProblem(errorMessage(e));

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
  const { remaining } = planTotals(plan.data);
  const last = step === steps.length - 1;

  const extras = [
    { key: 'debt' as const, title: 'A debt', about: 'A card or loan, to see your debt-free date.', count: debts.data?.debts.length ?? 0 },
    { key: 'goal' as const, title: 'A savings goal', about: 'Something to save for, with a target.', count: savings.data?.goals.length ?? 0 },
    { key: 'account' as const, title: 'An investment account', about: 'A 401(k), IRA or brokerage account.', count: investments.data?.accounts.length ?? 0 },
  ];

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box component="img" src={mascot} alt="" sx={{ width: 72, height: 'auto', flexShrink: 0 }} />
        <Box>
          <Typography variant="h4" component="h1">
            Let's set up your plan
          </Typography>
          <Typography color="text.secondary">Three quick steps. You can change everything later.</Typography>
        </Box>
      </Box>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
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
                Your pay after taxes. If it varies, use a typical month.
              </Typography>
              <Box sx={{ maxWidth: 320 }}>
                <MoneyField label="Monthly take-home income" size="medium" value={income} disabled={readOnly} onCommit={(value) => updateIncome.mutate(value, { onError })} />
              </Box>
            </>
          )}

          {step === 1 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                How much goes to each of these every month?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Type dollars or a percent of income, like 10%. Leave any at $0 for now. You'll add rent, groceries and the rest on the Plan page.
              </Typography>
              <Box sx={{ display: 'grid', gap: 2.5 }}>
                {builtIns.map((category: Category) => (
                  <Box key={category.id} sx={{ display: 'grid', gap: 1.5, alignItems: 'center', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px' } }}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{category.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {builtInHelp[category.kind]}
                      </Typography>
                    </Box>
                    <MoneyField
                      value={category.amount}
                      percentOf={income}
                      ariaLabel={`${category.name} amount`}
                      disabled={readOnly}
                      onCommit={(amount) => updateCategory.mutate({ id: category.id, changes: { amount } }, { onError })}
                    />
                  </Box>
                ))}
              </Box>
              <Typography sx={{ mt: 3 }} color={remaining < 0 ? 'error.main' : 'text.secondary'}>
                {remaining < 0
                  ? `That's ${formatMoney(-remaining)} more than your income.`
                  : `${formatMoney(remaining)} of your ${formatMoney(income)} is left for everything else.`}
              </Typography>
            </>
          )}

          {step === 2 && (
            <>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Add what you have and owe
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
            <Button color="inherit" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!last && (
                <Button color="inherit" onClick={() => navigate('/')}>
                  Skip for now
                </Button>
              )}
              <Button variant="contained" onClick={() => (last ? navigate('/') : setStep(step + 1))}>
                {last ? 'See my dashboard' : 'Next'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <DebtDialog open={adding === 'debt'} onClose={() => setAdding(null)} />
      <GoalDialog open={adding === 'goal'} showShare={false} onClose={() => setAdding(null)} />
      <AccountDialog open={adding === 'account'} onClose={() => setAdding(null)} />
    </Box>
  );
}
