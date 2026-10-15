import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import mascot from '../../assets/mascot.png';
import { Figure } from '../../components/Figure';
import { PageHeader } from '../../components/PageHeader';
import { InvestHint } from '../hints/PageHints';
import { PlanAmountBanner } from '../../components/PlanAmountBanner';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatMoney } from '../../lib/money';
import { AccountDialog } from './AccountDialog';
import { GrowthChart } from './GrowthChart';
import { SplitDialog } from './SplitDialog';
import {
  accountTypeLabels,
  MILESTONE_YEARS,
  useDeleteAccount,
  useInvestmentProjection,
  useInvestments,
  type Account,
  type InvestmentProjection,
  type InvestmentsData,
} from './investments';

const SUBTITLE = 'Split your Investment allocation across accounts and watch it grow.';
const DISCLAIMER = 'Estimates based on your plan and assumed returns, not financial advice.';

export function InvestPage() {
  const { data, isPending, isError, error, refetch } = useInvestments();

  if (isPending) {
    return (
      <>
        <PageHeader title="Invest" subtitle={SUBTITLE} />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Invest" subtitle={SUBTITLE} />
        <Alert severity="error" action={<Button color="inherit" onClick={() => refetch()}>Retry</Button>}>
          {errorMessage(error)}
        </Alert>
      </>
    );
  }

  return <InvestModule data={data} />;
}

function InvestModule({ data }: { data: InvestmentsData }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;
  const projection = useInvestmentProjection(data);
  const remove = useDeleteAccount();

  const [tab, setTab] = useState<'overview' | 'growth'>('overview');
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const hasAccounts = data.accounts.length > 0;
  const splitBroken = hasAccounts && Math.abs(projection.sharesTotal - 100) > 0.01;
  const valueIn = (years: number) => projection.years[years].value;

  const addButton = (
    <Button variant="contained" startIcon={<AddIcon />} disabled={readOnly} onClick={() => setEditing('new')}>
      Add an account
    </Button>
  );

  return (
    <>
      <PageHeader title="Invest" subtitle={SUBTITLE} actions={hasAccounts ? addButton : undefined} />
      <InvestHint />
      <PlanAmountBanner amount={data.monthlyAmount} />

      {!hasAccounts ? (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3, p: { xs: 3, md: 4 } }}>
            <Box component="img" src={mascot} alt="" sx={{ width: 120, height: 'auto', flexShrink: 0 }} />
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                No accounts yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 520 }}>
                Add your 401(k), IRA or brokerage account to see what your monthly investing could grow into, including any employer match.
              </Typography>
              {addButton}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          {splitBroken && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" disabled={readOnly} onClick={() => setSplitting(true)}>
                  Fix split
                </Button>
              }
            >
              Your accounts' shares add up to {Number(projection.sharesTotal.toFixed(2))}%, not 100%. Until you fix it, they're scaled to use the whole monthly amount.
            </Alert>
          )}
          {data.monthlyAmount <= 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Your plan doesn't put anything into Investments yet, so this shows growth on today's balances only. Give Investments an amount in Plan.
            </Alert>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'grid', gap: { xs: 2, md: 4 }, alignItems: 'start', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
              <Figure label="Invested today" value={formatMoney(projection.totalToday)} />
              <Figure label="In 10 years" value={formatMoney(Math.round(valueIn(10)))} color="success.main" />
              <Figure label="In 30 years" value={formatMoney(Math.round(valueIn(30)))} color="success.main" />
              <Figure
                label="Employer match"
                value={`${formatMoney(Math.round(projection.matchNextMonth))}/month`}
                note={projection.matchNextMonth > 0 ? 'Added on top of what you put in.' : 'Add a match to an account if your employer offers one.'}
              />
            </CardContent>
          </Card>

          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab value="overview" label="Overview" />
            <Tab value="growth" label="Growth" />
          </Tabs>

          {tab === 'overview' ? (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                  <Typography variant="h6">Your accounts</Typography>
                  {data.accounts.length > 1 && (
                    <Button size="small" variant="outlined" disabled={readOnly} onClick={() => setSplitting(true)}>
                      Change split
                    </Button>
                  )}
                </Box>
                <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
                  {data.accounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      monthly={(data.monthlyAmount * account.sharePercent) / (projection.sharesTotal || 100)}
                      readOnly={readOnly}
                      onEdit={() => setEditing(account)}
                      onDelete={() => setDeleting(account)}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'grid', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Contributions vs growth
                  </Typography>
                  <GrowthChart years={projection.years} />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    What it could be worth
                  </Typography>
                  <Milestones projection={projection} />
                </CardContent>
              </Card>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {DISCLAIMER}
          </Typography>
        </>
      )}

      <AccountDialog open={editing !== null} account={editing === 'new' || editing === null ? undefined : editing} onClose={() => setEditing(null)} />
      <SplitDialog open={splitting} accounts={data.accounts} monthlyAmount={data.monthlyAmount} onClose={() => setSplitting(false)} />

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This removes the account and its balance from your investments and your net worth. You can add it again later.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id, { onError: (e) => setProblem(errorMessage(e)), onSettled: () => setDeleting(null) })}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!problem} autoHideDuration={8000} onClose={() => setProblem(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      </Snackbar>
    </>
  );
}

function AccountRow({ account, monthly, readOnly, onEdit, onDelete }: { account: Account; monthly: number; readOnly: boolean; onEdit: () => void; onDelete: () => void }) {
  const match =
    account.matchPercent === null || account.matchPercent === 0
      ? null
      : `${account.matchPercent}% match${account.matchLimitPercent === null ? '' : ` up to ${account.matchLimitPercent}% of income`}`;

  return (
    <Box
      sx={{
        display: 'grid',
        alignItems: 'center',
        columnGap: 1.5,
        rowGap: 0.5,
        px: { xs: 0.5, sm: 1 },
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: 'minmax(0, 1.4fr) 1fr 1fr auto' },
        gridTemplateAreas: { xs: '"name actions" "balance balance" "monthly monthly"', md: '"name balance monthly actions"' },
      }}
    >
      <Box sx={{ gridArea: 'name', minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {account.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {accountTypeLabels[account.type]}
        </Typography>
      </Box>
      <Box sx={{ gridArea: 'balance' }}>
        <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(account.balance)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {account.expectedReturn}% expected return
        </Typography>
      </Box>
      <Box sx={{ gridArea: 'monthly' }}>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(monthly)}/month · {account.sharePercent}%
        </Typography>
        {match && (
          <Typography variant="caption" color="text.secondary">
            {match}
          </Typography>
        )}
      </Box>
      <Box sx={{ gridArea: 'actions', display: 'flex' }}>
        <Tooltip title="Edit or update balance">
          <span>
            <IconButton size="small" aria-label={`Edit ${account.name}`} disabled={readOnly} onClick={onEdit}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete">
          <span>
            <IconButton size="small" aria-label={`Delete ${account.name}`} disabled={readOnly} onClick={onDelete}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

function Milestones({ projection }: { projection: InvestmentProjection }) {
  const whole = (value: number) => formatMoney(Math.round(value));
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 480, '& td, & th': { fontVariantNumeric: 'tabular-nums' } }}>
        <TableHead>
          <TableRow>
            <TableCell>In</TableCell>
            <TableCell align="right">Value</TableCell>
            <TableCell align="right">You put in</TableCell>
            <TableCell align="right">Employer match</TableCell>
            <TableCell align="right">Growth</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {MILESTONE_YEARS.map((years) => {
            const point = projection.years[years];
            return (
              <TableRow key={years}>
                <TableCell>{years} years</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {whole(point.value)}
                </TableCell>
                <TableCell align="right">{whole(point.contributed)}</TableCell>
                <TableCell align="right">{whole(point.matched)}</TableCell>
                <TableCell align="right" sx={{ color: 'success.main' }}>
                  {whole(point.growth)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
