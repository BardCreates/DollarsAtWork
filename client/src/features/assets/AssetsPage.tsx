import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Link,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { Figure } from '../../components/Figure';
import { PageHeader } from '../../components/PageHeader';
import { formatMoney } from '../../lib/money';
import { otherItemTypeLabels, useDeleteOtherItem, useNetWorth, type OtherItem } from '../dashboard/networth';
import { AssetsHint } from '../hints/PageHints';
import { AssetDialog } from './AssetDialog';

const SUBTITLE = 'Your home, car and other things you own. They count toward your net worth from day one.';

/** How many items the server allows per account. */
const MAX_ITEMS = 50;

export function AssetsPage() {
  const { data, isPending, isError, error, refetch } = useNetWorth();

  if (isPending) {
    return (
      <>
        <PageHeader title="Assets" subtitle={SUBTITLE} />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Assets" subtitle={SUBTITLE} />
        <Alert severity="error" action={<Button color="inherit" onClick={() => refetch()}>Retry</Button>}>
          {errorMessage(error)}
        </Alert>
      </>
    );
  }

  return <AssetsModule items={data.items} />;
}

type Editing = { item?: OtherItem } | null;

function AssetsModule({ items }: { items: OtherItem[] }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;
  const remove = useDeleteOtherItem();

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<OtherItem | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const owned = items.filter((item) => item.kind === 'Asset');
  const owed = items.filter((item) => item.kind === 'Liability');
  const total = (list: OtherItem[]) => list.reduce((sum, item) => sum + item.value, 0);

  const addButton = (
    <Button variant="contained" startIcon={<AddIcon />} disabled={readOnly || items.length >= MAX_ITEMS} onClick={() => setEditing({})}>
      Add something
    </Button>
  );

  return (
    <>
      <PageHeader title="Assets" subtitle={SUBTITLE} actions={items.length > 0 ? addButton : undefined} />
      <AssetsHint />

      {items.length === 0 ? (
        <Card>
          <CardContent sx={{ p: { xs: 2.5, md: 4 }, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Own a home or a car?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 520, mx: 'auto' }}>
              Add it here at what it would sell for today, and your net worth counts it from now on. Loans with a monthly payment go on the{' '}
              <Link component={RouterLink} to="/debt" underline="hover">
                Debt
              </Link>{' '}
              page.
            </Typography>
            {addButton}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, md: 4 }, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
              <Figure label="What you own" value={formatMoney(total(owned))} color="success.main" note={`${owned.length} ${owned.length === 1 ? 'item' : 'items'}`} />
              <Figure
                label="Owed outside the Debt page"
                value={formatMoney(total(owed))}
                color={owed.length > 0 ? 'error.main' : 'text.primary'}
                note={owed.length > 0 ? `${owed.length} ${owed.length === 1 ? 'item' : 'items'}` : 'Loans with a payment live on the Debt page.'}
              />
              <Figure label="Added to net worth" value={formatMoney(total(owned) - total(owed))} note="Savings, investments and debts are counted on their own pages." />
            </CardContent>
          </Card>

          <ItemList title="What you own" items={owned} readOnly={readOnly} onEdit={(item) => setEditing({ item })} onDelete={setDeleting} />
          {owed.length > 0 && (
            <ItemList title="What you owe, outside the Debt page" items={owed} readOnly={readOnly} onEdit={(item) => setEditing({ item })} onDelete={setDeleting} />
          )}
        </>
      )}

      <AssetDialog open={editing !== null} item={editing?.item} onClose={() => setEditing(null)} />

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>Remove {deleting?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>It stops counting toward your net worth. You can add it back any time.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setDeleting(null)}>
            Keep it
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null), onError: (e) => setProblem(errorMessage(e)) })}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={problem !== null} autoHideDuration={6000} onClose={() => setProblem(null)}>
        <Alert severity="error" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      </Snackbar>
    </>
  );
}

function ItemList({
  title,
  items,
  readOnly,
  onEdit,
  onDelete,
}: {
  title: string;
  items: OtherItem[];
  readOnly: boolean;
  onEdit: (item: OtherItem) => void;
  onDelete: (item: OtherItem) => void;
}) {
  const change = (item: OtherItem) =>
    item.yearlyChangePercent === 0 ? 'Holds its value' : `${item.yearlyChangePercent > 0 ? '+' : '−'}${Math.abs(item.yearlyChangePercent)}% a year`;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderTop: 1, borderColor: 'divider', minWidth: 0 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap>{item.name}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {otherItemTypeLabels[item.type]} · {change(item)}
                </Typography>
              </Box>
              <Typography color={item.kind === 'Asset' ? 'success.main' : 'error.main'} sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(item.value)}
              </Typography>
              <Box sx={{ display: 'flex' }}>
                <Tooltip title="Edit">
                  <span>
                    <IconButton size="small" aria-label={`Edit ${item.name}`} disabled={readOnly} onClick={() => onEdit(item)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Remove">
                  <span>
                    <IconButton size="small" aria-label={`Remove ${item.name}`} disabled={readOnly} onClick={() => onDelete(item)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
