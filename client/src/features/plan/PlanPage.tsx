import { useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Snackbar, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Figure } from '../../components/Figure';
import { PageHeader } from '../../components/PageHeader';
import { MoneyField } from '../../components/MoneyField';
import { errorMessage } from '../../api/client';
import { useMe } from '../../auth/auth';
import { formatMoney, formatPercent } from '../../lib/money';
import { AddCategoryForm } from './AddCategoryForm';
import { AllocationDonut } from './AllocationDonut';
import { CategoryRow } from './CategoryRow';
import {
  planMutationKey,
  planTotals,
  useAddCategory,
  useDeleteCategory,
  usePlan,
  useReorderCategories,
  useScaleCategories,
  useUpdateCategory,
  useUpdateIncome,
  type Category,
  type Plan,
} from './plan';

const SUBTITLE = 'Give every dollar of your monthly income a job.';

export function PlanPage() {
  const { data: plan, isPending, isError, error, refetch } = usePlan();

  if (isPending) {
    return (
      <>
        <PageHeader title="Plan" subtitle={SUBTITLE} />
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Plan" subtitle={SUBTITLE} />
        <Alert severity="error" action={<Button color="inherit" onClick={() => refetch()}>Retry</Button>}>
          {errorMessage(error)}
        </Alert>
      </>
    );
  }

  return <PlanEditor plan={plan} />;
}

function PlanEditor({ plan }: { plan: Plan }) {
  const { data: me } = useMe();
  const readOnly = !me?.access.hasFullAccess;

  const updateIncome = useUpdateIncome();
  const scaleCategories = useScaleCategories();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const addCategory = useAddCategory();
  const saving = useIsMutating({ mutationKey: planMutationKey }) > 0;

  const [problem, setProblem] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<{ category: Category; index: number } | null>(null);
  /** Set after an income change: the income the current amounts were planned against. */
  const [scaleFrom, setScaleFrom] = useState<number | null>(null);

  const onError = (e: unknown) => setProblem(errorMessage(e));
  const { allocated, remaining } = planTotals(plan);
  const income = plan.monthlyIncome;

  const changeIncome = (next: number) => {
    const plannedAgainst = scaleFrom ?? income;
    setScaleFrom(plannedAgainst > 0 && allocated > 0 && next > 0 && next !== plannedAgainst ? plannedAgainst : null);
    updateIncome.mutate(next, { onError });
  };

  const removeCategory = (category: Category, index: number) => {
    deleteCategory.mutate(category.id, { onError, onSuccess: () => setDeleted({ category, index }) });
  };

  const undoDelete = () => {
    if (!deleted) return;
    const { category, index } = deleted;
    setDeleted(null);
    addCategory.mutate({ name: category.name, amount: category.amount, color: category.color, position: index }, { onError });
  };

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    const ids = plan.categories.map((c) => c.id);
    const [moved] = ids.splice(source.index, 1);
    ids.splice(destination.index, 0, moved);
    reorderCategories.mutate(ids, { onError });
  };

  return (
    <>
      <PageHeader title="Plan" subtitle={SUBTITLE} actions={<SaveStatus saving={saving} />} />

      <Card sx={{ mb: 3 }}>
        <CardContent
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 4 },
            alignItems: { xs: 'start', md: 'center' },
            gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(220px, 1.2fr) 1fr 1fr' },
          }}
        >
          <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
            <MoneyField label="Monthly take-home income" size="medium" value={income} disabled={readOnly} onCommit={changeIncome} />
          </Box>
          <Figure label="Allocated" value={formatMoney(allocated)} note={income > 0 ? `${formatPercent(allocated, income)} of income` : undefined} />
          <Figure
            label={remaining < 0 ? 'Over-allocated by' : 'Remaining'}
            value={formatMoney(Math.abs(remaining))}
            color={remaining < 0 ? 'error.main' : remaining > 0 ? 'success.main' : 'text.primary'}
            note={remaining < 0 ? 'Your categories add up to more than your income.' : remaining > 0 ? 'Not yet given a job.' : income > 0 ? 'Every dollar has a job.' : undefined}
          />
        </CardContent>
      </Card>

      {scaleFrom !== null && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          onClose={() => setScaleFrom(null)}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                disabled={readOnly || scaleCategories.isPending}
                onClick={() => scaleCategories.mutate(scaleFrom, { onError, onSuccess: () => setScaleFrom(null) })}
              >
                Scale all to new income
              </Button>
              <Button color="inherit" size="small" onClick={() => setScaleFrom(null)}>
                Keep amounts
              </Button>
            </Box>
          }
        >
          Your income changed from {formatMoney(scaleFrom)} to {formatMoney(income)}. Category amounts stayed the same.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.7fr) minmax(280px, 1fr)' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6">Categories</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Type an amount in dollars or as a percent of income. Drag to reorder. Changes save as you go.
            </Typography>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories">
                {(drop) => (
                  <Box ref={drop.innerRef} {...drop.droppableProps} sx={{ borderTop: 1, borderColor: 'divider' }}>
                    {plan.categories.map((category, index) => (
                      <CategoryRow
                        key={category.id}
                        category={category}
                        index={index}
                        income={income}
                        readOnly={readOnly}
                        onChange={(changes) => updateCategory.mutate({ id: category.id, changes }, { onError })}
                        onDelete={() => removeCategory(category, index)}
                      />
                    ))}
                    {drop.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>

            <AddCategoryForm categories={plan.categories} income={income} disabled={readOnly} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Where it goes
            </Typography>
            <AllocationDonut plan={plan} />
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        key={deleted?.category.id}
        open={!!deleted}
        autoHideDuration={8000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setDeleted(null);
        }}
        message={deleted ? `Deleted ${deleted.category.name}.` : ''}
        action={
          <Button color="primary" size="small" onClick={undoDelete}>
            Undo
          </Button>
        }
      />

      <Snackbar open={!!problem} autoHideDuration={8000} onClose={() => setProblem(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setProblem(null)}>
          {problem}
        </Alert>
      </Snackbar>
    </>
  );
}

function SaveStatus({ saving }: { saving: boolean }) {
  return (
    <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', minHeight: 32 }}>
      {saving ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
      <Typography variant="body2">{saving ? 'Saving…' : 'All changes saved'}</Typography>
    </Box>
  );
}
