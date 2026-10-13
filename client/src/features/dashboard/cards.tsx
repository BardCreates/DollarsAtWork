import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, LinearProgress, Link, Typography, useTheme } from '@mui/material';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import { brand } from '../../theme';
import { debtTypeLabels } from '../debt/debts';
import { AllocationDonut } from '../plan/AllocationDonut';
import { planTotals } from '../plan/plan';
import { otherItemTypeLabels, type Snapshot } from './networth';
import type { DashboardData } from './useDashboard';

const whole = (value: number) => formatMoney(Math.round(value));

/** A dashboard card with a title and an optional link to the module it summarizes. */
export function DashCard({ title, to, linkLabel, children }: { title: string; to?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
          <Typography variant="h6">{title}</Typography>
          {to && (
            <Link component={RouterLink} to={to} variant="body2" underline="hover">
              {linkLabel}
            </Link>
          )}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <Typography variant="body2" color="text.secondary">
    {children}
  </Typography>
);

export function PlanCard({ data }: { data: DashboardData }) {
  const { remaining } = planTotals(data.plan);
  return (
    <DashCard title="This month's plan" to="/plan" linkLabel="Edit plan">
      {remaining < 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Over-allocated by {formatMoney(-remaining)}.
        </Alert>
      )}
      <AllocationDonut plan={data.plan} />
    </DashCard>
  );
}

export function DebtPayoffCard({ data, result }: { data: DashboardData; result: ProjectionResult }) {
  const theme = useTheme();
  const total = data.debts.debts.reduce((sum, d) => sum + d.balance, 0);
  if (total <= 0) {
    return (
      <DashCard title="Debt payoff" to="/debt" linkLabel="Debt">
        <Empty>No debts to pay off. Add any you have on the Debt page.</Empty>
      </DashCard>
    );
  }

  const lastMonth = Math.min(result.debtFreeMonth ?? 120, result.points.length - 1);
  const rows = result.points.slice(0, lastMonth + 1).map((point) => ({ month: point.month, debt: point.debt }));

  return (
    <DashCard title="Debt payoff" to="/debt" linkLabel="Debt">
      <Typography variant="body2" color="text.secondary">
        {whole(total)} today
      </Typography>
      <Typography variant="h6" color={result.debtFreeMonth === null ? 'warning.main' : 'success.main'} sx={{ mb: 1 }}>
        {result.debtFreeMonth === null ? 'Not paid off within 40 years' : `Debt-free ${formatMonthFromNow(result.debtFreeMonth)} · ${formatDuration(result.debtFreeMonth)}`}
      </Typography>
      <Box sx={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" type="number" domain={[0, lastMonth]} tickFormatter={(m: number) => formatMonthFromNow(m)} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} stroke={theme.palette.divider} tickCount={3} minTickGap={40} />
            <YAxis hide domain={[0, 'dataMax']} />
            <Tooltip
              labelFormatter={(m) => formatMonthFromNow(Number(m))}
              formatter={(value) => whole(Number(value))}
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
              labelStyle={{ color: theme.palette.text.secondary }}
            />
            <Area type="monotone" dataKey="debt" name="Debt" stroke={brand.red} fill={brand.red} fillOpacity={0.35} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </DashCard>
  );
}

export function GoalsCard({ data, result }: { data: DashboardData; result: ProjectionResult }) {
  const { goals } = data.savings;
  return (
    <DashCard title="Savings goals" to="/savings" linkLabel="Savings">
      {goals.length === 0 ? (
        <Empty>No goals yet. Start with an emergency fund on the Savings page.</Empty>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2 }}>
          {goals.map((goal, index) => {
            const percent = goal.targetAmount > 0 ? Math.min(100, (goal.currentBalance / goal.targetAmount) * 100) : 100;
            const month = result.goalFullMonths[index];
            return (
              <Box key={goal.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {goal.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {month === null ? 'Not within 40 years' : month === 0 ? 'Done' : formatMonthFromNow(month)}
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={percent} color={month === 0 ? 'success' : 'primary'} aria-label={`${goal.name} progress`} sx={{ height: 8, borderRadius: 4 }} />
                <Typography variant="caption" color="text.secondary">
                  {formatMoney(goal.currentBalance)} of {formatMoney(goal.targetAmount)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </DashCard>
  );
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export function HistoryCard({ snapshots }: { snapshots: Snapshot[] }) {
  const theme = useTheme();
  if (snapshots.length < 2) {
    return (
      <DashCard title="Net worth history">
        <Empty>
          {snapshots.length === 0
            ? 'Your history is built from your monthly check-ins. Do your first one to start it.'
            : `First check-in saved: ${whole(snapshots[0].netWorth)}. Your chart appears after next month's check-in.`}
        </Empty>
      </DashCard>
    );
  }

  const rows = snapshots.map((snapshot) => ({ label: shortDate.format(new Date(snapshot.date)), netWorth: snapshot.netWorth }));
  return (
    <DashCard title="Net worth history">
      <Box sx={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.palette.divider} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} stroke={theme.palette.divider} minTickGap={24} />
            <YAxis tickFormatter={(value: number) => formatMoneyCompact(value)} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} stroke={theme.palette.divider} width={60} domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value) => whole(Number(value))}
              contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
              labelStyle={{ color: theme.palette.text.secondary }}
            />
            <Line type="monotone" dataKey="netWorth" name="Net worth" stroke={brand.green} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </DashCard>
  );
}

interface Bar {
  label: string;
  amount: number;
}

/** Totals by type: what is owned in green, what is owed in red. */
export function AssetsLiabilitiesCard({ data, readOnly, onManage }: { data: DashboardData; readOnly: boolean; onManage: () => void }) {
  const add = (bars: Map<string, number>, label: string, amount: number) => {
    if (amount > 0) bars.set(label, (bars.get(label) ?? 0) + amount);
  };

  const assets = new Map<string, number>();
  add(assets, 'Savings', data.savings.goals.reduce((sum, g) => sum + g.currentBalance, 0));
  add(assets, 'Investments', data.investments.accounts.reduce((sum, a) => sum + a.balance, 0));
  const liabilities = new Map<string, number>();
  data.debts.debts.forEach((debt) => add(liabilities, debtTypeLabels[debt.type], debt.balance));
  data.netWorth.items.forEach((item) => add(item.kind === 'Asset' ? assets : liabilities, otherItemTypeLabels[item.type], item.value));

  const toBars = (bars: Map<string, number>): Bar[] => [...bars].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
  const assetBars = toBars(assets);
  const liabilityBars = toBars(liabilities);
  const largest = Math.max(1, ...assetBars.map((b) => b.amount), ...liabilityBars.map((b) => b.amount));

  const group = (title: string, bars: Bar[], color: string, none: string) => (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title} · {whole(bars.reduce((sum, b) => sum + b.amount, 0))}
      </Typography>
      {bars.length === 0 ? (
        <Empty>{none}</Empty>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1 }}>
          {bars.map((bar) => (
            <Box key={bar.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2">{bar.label}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {whole(bar.amount)}
                </Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'divider' }}>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: color, width: `${Math.max(2, (bar.amount / largest) * 100)}%` }} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <DashCard title="Assets vs liabilities">
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {group('What you own', assetBars, 'success.main', 'Nothing yet.')}
        {group('What you owe', liabilityBars, 'error.main', 'Nothing. Nice.')}
      </Box>
      <Button size="small" variant="outlined" sx={{ mt: 2.5 }} disabled={readOnly} onClick={onManage}>
        Add a home, car or other item
      </Button>
    </DashCard>
  );
}

const longDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function CheckInCard({ snapshots, readOnly, onStart, onShowReport }: { snapshots: Snapshot[]; readOnly: boolean; onStart: () => void; onShowReport: () => void }) {
  const last = snapshots.at(-1);
  const now = new Date();
  const doneThisMonth = !!last && last.date.slice(0, 7) === `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  return (
    <DashCard title="Monthly check-in">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {last
          ? `Last check-in: ${longDate.format(new Date(last.date))}. ${doneThisMonth ? "You're up to date for this month." : "It's time for this month's."}`
          : 'Once a month, confirm your real balances so your projections start from the truth. It takes a minute.'}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant={doneThisMonth ? 'outlined' : 'contained'} disabled={readOnly} onClick={onStart}>
          {doneThisMonth ? 'Update balances' : 'Start check-in'}
        </Button>
        {last && <Button onClick={onShowReport}>See your recap</Button>}
      </Box>
    </DashCard>
  );
}
