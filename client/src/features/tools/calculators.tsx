import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Figure } from '../../components/Figure';
import { compoundGrowth, drip, loanCost, loanPayoff, type GrowthYear } from '../../lib/calculators';
import { formatDuration, formatMonthFromNow } from '../../lib/dates';
import { formatMoney, formatMoneyCompact } from '../../lib/money';
import { brand } from '../../theme';
import { NumberField } from './NumberField';

const whole = (value: number) => formatMoney(Math.round(value));

/** Inputs on the left (top on phones), results on the right. */
function Calculator({ inputs, children }: { inputs: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '300px minmax(0, 1fr)' } }}>
      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>{inputs}</CardContent>
      </Card>
      <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function Figures({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ display: 'grid', gap: { xs: 2, md: 4 }, alignItems: 'start', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>{children}</CardContent>
    </Card>
  );
}

function useChartStyle() {
  const theme = useTheme();
  return {
    grid: theme.palette.divider,
    tick: { fill: theme.palette.text.secondary, fontSize: 12 },
    tooltip: { background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 },
    label: { color: theme.palette.text.secondary },
    legend: { fontSize: 13, color: theme.palette.text.secondary },
  };
}

const yearLabel = (year: unknown) => `Year ${year}`;

/** What went in and what growth added, year by year. Shared by the calculators that grow a monthly amount. */
function GrowthChartCard({ rows }: { rows: GrowthYear[] }) {
  const style = useChartStyle();
  return (
    <Card>
      <CardContent>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={style.grid} vertical={false} />
              <XAxis dataKey="year" tick={style.tick} stroke={style.grid} minTickGap={24} />
              <YAxis tickFormatter={(value: number) => formatMoneyCompact(value)} tick={style.tick} stroke={style.grid} width={60} />
              <Tooltip labelFormatter={yearLabel} formatter={(value) => whole(Number(value))} contentStyle={style.tooltip} labelStyle={style.label} />
              <Legend wrapperStyle={style.legend} itemSorter={(item) => (item.dataKey === 'contributed' ? 0 : 1)} />
              <Area type="monotone" dataKey="contributed" name="You put in" stackId="value" stroke={brand.blue} fill={brand.blue} fillOpacity={0.4} />
              <Area type="monotone" dataKey="growth" name="Growth" stackId="value" stroke={brand.green} fill={brand.green} fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

export function CompoundCalculator() {
  const [initial, setInitial] = useState(5_000);
  const [monthly, setMonthly] = useState(300);
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(20);

  const rows = useMemo(() => compoundGrowth({ initial, monthly, annualRate, years }), [initial, monthly, annualRate, years]);
  const last = rows[rows.length - 1];

  return (
    <Calculator
      inputs={
        <>
          <NumberField label="Starting amount" prefix="$" value={initial} onChange={setInitial} />
          <NumberField label="Added each month" prefix="$" value={monthly} onChange={setMonthly} />
          <NumberField label="Yearly return" suffix="%" max={50} value={annualRate} onChange={setAnnualRate} />
          <NumberField label="For" suffix="years" max={60} value={years} onChange={setYears} />
        </>
      }
    >
      <Figures>
        <Figure label={`After ${last.year} ${last.year === 1 ? 'year' : 'years'}`} value={whole(last.value)} color="success.main" />
        <Figure label="You put in" value={whole(last.contributed)} />
        <Figure label="Growth" value={whole(last.growth)} color="success.main" />
      </Figures>
      <GrowthChartCard rows={rows} />
    </Calculator>
  );
}

export function PayoffCalculator() {
  const [balance, setBalance] = useState(15_000);
  const [apr, setApr] = useState(7);
  const [payment, setPayment] = useState(300);
  const [extra, setExtra] = useState(100);

  const base = useMemo(() => loanPayoff({ balance, apr, payment }), [balance, apr, payment]);
  const faster = useMemo(() => loanPayoff({ balance, apr, payment: payment + extra }), [balance, apr, payment, extra]);

  return (
    <Calculator
      inputs={
        <>
          <NumberField label="Loan balance" prefix="$" value={balance} onChange={setBalance} />
          <NumberField label="APR" suffix="%" max={100} value={apr} onChange={setApr} />
          <NumberField label="Monthly payment" prefix="$" value={payment} onChange={setPayment} />
          <NumberField label="Extra each month" prefix="$" value={extra} onChange={setExtra} helperText="What you could add on top." />
        </>
      }
    >
      {base.months === null && (
        <Alert severity="warning">
          At {formatMoney(payment)} a month this loan never gets paid off: the payment doesn't cover the interest
          {faster.months === null ? ', even with the extra.' : '. With the extra, it does.'}
        </Alert>
      )}
      <Figures>
        <Figure
          label="Paid off"
          value={faster.months === null ? 'Never' : formatMonthFromNow(faster.months)}
          color={faster.months === null ? 'warning.main' : 'success.main'}
          note={faster.months === null ? undefined : `In ${formatDuration(faster.months)} with the extra.`}
        />
        <Figure
          label="Time saved"
          value={base.months !== null && faster.months !== null ? formatDuration(base.months - faster.months) : '—'}
          note={base.months === null ? undefined : `Without the extra: ${formatDuration(base.months)}.`}
        />
        <Figure
          label="Interest saved"
          value={base.months !== null && faster.months !== null ? whole(base.totalInterest - faster.totalInterest) : '—'}
          color="success.main"
          note={faster.months === null ? undefined : `You'd pay ${whole(faster.totalInterest)} instead${base.months === null ? '.' : ` of ${whole(base.totalInterest)}.`}`}
        />
      </Figures>
    </Calculator>
  );
}

export function LoanCompareCalculator() {
  const [amount, setAmount] = useState(25_000);
  const [aprA, setAprA] = useState(6.5);
  const [yearsA, setYearsA] = useState(4);
  const [aprB, setAprB] = useState(7.5);
  const [yearsB, setYearsB] = useState(6);

  const a = useMemo(() => loanCost({ amount, apr: aprA, years: yearsA }), [amount, aprA, yearsA]);
  const b = useMemo(() => loanCost({ amount, apr: aprB, years: yearsB }), [amount, aprB, yearsB]);
  const cheaper = a.totalInterest === b.totalInterest ? null : a.totalInterest < b.totalInterest ? 'A' : 'B';

  const loan = (name: string, cost: typeof a, best: boolean) => (
    <Card sx={best ? { outline: 2, outlineStyle: 'solid', outlineColor: 'success.main' } : undefined}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {name}
          {best && (
            <Typography component="span" variant="body2" color="success.main" sx={{ ml: 1 }}>
              costs less
            </Typography>
          )}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
          <Figure label="Monthly payment" value={formatMoney(cost.payment, { cents: true })} />
          <Figure label="Total interest" value={whole(cost.totalInterest)} color="error.main" />
          <Figure label="Total paid" value={whole(cost.totalPaid)} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Calculator
      inputs={
        <>
          <NumberField label="Loan amount" prefix="$" value={amount} onChange={setAmount} />
          <Typography variant="subtitle2">Loan A</Typography>
          <NumberField label="APR" suffix="%" max={100} value={aprA} onChange={setAprA} />
          <NumberField label="Term" suffix="years" max={50} value={yearsA} onChange={setYearsA} />
          <Typography variant="subtitle2">Loan B</Typography>
          <NumberField label="APR" suffix="%" max={100} value={aprB} onChange={setAprB} />
          <NumberField label="Term" suffix="years" max={50} value={yearsB} onChange={setYearsB} />
        </>
      }
    >
      {loan('Loan A', a, cheaper === 'A')}
      {loan('Loan B', b, cheaper === 'B')}
      {cheaper && (
        <Typography color="text.secondary">
          Loan {cheaper} costs {whole(Math.abs(a.totalInterest - b.totalInterest))} less in interest. Loan {a.payment <= b.payment ? 'A' : 'B'} has the lower monthly
          payment, by {formatMoney(Math.abs(a.payment - b.payment), { cents: true })}.
        </Typography>
      )}
    </Calculator>
  );
}

export function DripCalculator() {
  const [initial, setInitial] = useState(10_000);
  const [yearlyContribution, setYearlyContribution] = useState(1_200);
  const [priceGrowth, setPriceGrowth] = useState(5);
  const [dividendYield, setDividendYield] = useState(3);
  const [years, setYears] = useState(20);
  const style = useChartStyle();

  const rows = useMemo(
    () => drip({ initial, yearlyContribution, priceGrowth, dividendYield, years }),
    [initial, yearlyContribution, priceGrowth, dividendYield, years],
  );
  const last = rows[rows.length - 1];

  return (
    <Calculator
      inputs={
        <>
          <NumberField label="Starting investment" prefix="$" value={initial} onChange={setInitial} />
          <NumberField label="Added each year" prefix="$" value={yearlyContribution} onChange={setYearlyContribution} />
          <NumberField label="Share price growth" suffix="% a year" max={50} value={priceGrowth} onChange={setPriceGrowth} />
          <NumberField label="Dividend yield" suffix="% a year" max={50} value={dividendYield} onChange={setDividendYield} />
          <NumberField label="For" suffix="years" max={60} value={years} onChange={setYears} />
        </>
      }
    >
      <Figures>
        <Figure label="Reinvesting dividends" value={whole(last.reinvested)} color="success.main" />
        <Figure label="Taking them as cash" value={whole(last.notReinvested)} note="Shares plus the cash collected." />
        <Figure label="Reinvesting adds" value={whole(last.reinvested - last.notReinvested)} color="success.main" note={`Dividends in the last year: ${whole(last.dividends)}.`} />
      </Figures>
      <Card>
        <CardContent>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={style.grid} vertical={false} />
                <XAxis dataKey="year" tick={style.tick} stroke={style.grid} minTickGap={24} />
                <YAxis tickFormatter={(value: number) => formatMoneyCompact(value)} tick={style.tick} stroke={style.grid} width={60} />
                <Tooltip labelFormatter={yearLabel} formatter={(value) => whole(Number(value))} contentStyle={style.tooltip} labelStyle={style.label} />
                <Legend wrapperStyle={style.legend} itemSorter={(item) => (item.dataKey === 'reinvested' ? 0 : 1)} />
                <Line type="monotone" dataKey="reinvested" name="Reinvesting dividends" stroke={brand.green} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="notReinvested" name="Taking them as cash" stroke={brand.blue} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Calculator>
  );
}

/** "What would that daily coffee be worth?": a monthly habit, invested instead, over some years. */
export function HabitCalculator() {
  const [monthly, setMonthly] = useState(250);
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(10);

  const rows = useMemo(() => compoundGrowth({ initial: 0, monthly, annualRate, years }), [monthly, annualRate, years]);
  const last = rows[rows.length - 1];

  return (
    <Calculator
      inputs={
        <>
          <NumberField label="Spent each month" prefix="$" value={monthly} onChange={setMonthly} helperText="Dining out, subscriptions, a daily coffee." />
          <NumberField label="Yearly return if invested" suffix="%" max={50} value={annualRate} onChange={setAnnualRate} helperText="7% is a common long-run figure for stocks. It's an assumption, not a promise." />
          <NumberField label="For" suffix="years" max={60} value={years} onChange={setYears} />
        </>
      }
    >
      <Card>
        <CardContent>
          <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
            {formatMoney(monthly)} a month is {whole(monthly * 12)} a year. Invested instead, over {last.year} {last.year === 1 ? 'year' : 'years'} it could grow to about{' '}
            <Box component="span" sx={{ color: 'success.main' }}>
              {whole(last.value)}
            </Box>
            .
          </Typography>
        </CardContent>
      </Card>
      <Figures>
        <Figure label="You'd have spent" value={whole(last.contributed)} />
        <Figure label="Invested, it could be" value={whole(last.value)} color="success.main" />
        <Figure label="Growth on top" value={whole(last.growth)} color="success.main" />
      </Figures>
      <GrowthChartCard rows={rows} />
    </Calculator>
  );
}
