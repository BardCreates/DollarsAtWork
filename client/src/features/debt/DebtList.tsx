import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { formatMonthFromNow } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { ProjectionResult } from '../../lib/projection';
import { debtTypeLabels, type Debt } from './debts';

interface DebtListProps {
  debts: Debt[];
  planned: ProjectionResult;
  /** Rows can be dragged only in the Custom strategy, where their order is the payoff order. */
  canReorder: boolean;
  readOnly: boolean;
  onReorder: (ids: string[]) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}

export function DebtList({ debts, planned, canReorder, readOnly, onReorder, onEdit, onDelete }: DebtListProps) {
  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    const ids = debts.map((d) => d.id);
    const [moved] = ids.splice(source.index, 1);
    ids.splice(destination.index, 0, moved);
    onReorder(ids);
  };

  // The debt getting more than its minimum next month is the one the strategy is attacking.
  const nextMonth = planned.points[1];
  const isTarget = (debt: Debt, index: number) =>
    !!nextMonth && debt.balance > 0 && nextMonth.debtPayments[index] > Math.min(debt.minPayment, debt.balance + nextMonth.debtInterest[index]) + 0.005;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="debts">
        {(drop) => (
          <Box ref={drop.innerRef} {...drop.droppableProps} sx={{ borderTop: 1, borderColor: 'divider' }}>
            {debts.map((debt, index) => {
              const payoffMonth = planned.debtPayoffMonths[index];
              return (
                <Draggable key={debt.id} draggableId={debt.id} index={index} isDragDisabled={!canReorder || readOnly}>
                  {(drag, snapshot) => (
                    <Box
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      sx={{
                        display: 'grid',
                        alignItems: 'center',
                        columnGap: 1.5,
                        rowGap: 0.5,
                        px: { xs: 0.5, sm: 1 },
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: snapshot.isDragging ? 'background.paper' : 'transparent',
                        boxShadow: snapshot.isDragging ? 8 : 0,
                        gridTemplateColumns: { xs: 'auto minmax(0, 1fr) auto', md: 'auto minmax(0, 1.4fr) 1fr 1fr auto' },
                        gridTemplateAreas: {
                          xs: '"handle name actions" ". numbers numbers" ". payoff payoff"',
                          md: '"handle name numbers payoff actions"',
                        },
                      }}
                    >
                      <Box
                        {...drag.dragHandleProps}
                        aria-label={`Move ${debt.name}`}
                        sx={{ gridArea: 'handle', display: canReorder ? 'flex' : 'none', color: 'text.secondary', cursor: readOnly ? 'default' : 'grab' }}
                      >
                        <DragIndicatorIcon fontSize="small" />
                      </Box>

                      <Box sx={{ gridArea: 'name', minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 600 }} noWrap>
                            {debt.name}
                          </Typography>
                          {isTarget(debt, index) && <Chip size="small" color="primary" variant="outlined" label="Getting extra" />}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {debtTypeLabels[debt.type]}
                        </Typography>
                      </Box>

                      <Box sx={{ gridArea: 'numbers' }}>
                        <Typography color="error.main" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(debt.balance)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {debt.apr}% APR · {formatMoney(debt.minPayment)} minimum{debt.minimumOnly ? ' · minimum only' : ''}
                        </Typography>
                      </Box>

                      <Box sx={{ gridArea: 'payoff' }}>
                        <Typography variant="caption" color="text.secondary" component="div">
                          Paid off
                        </Typography>
                        <Typography variant="body2">
                          {debt.balance <= 0 ? 'Already' : payoffMonth === null ? 'Not within 40 years' : formatMonthFromNow(payoffMonth)}
                        </Typography>
                      </Box>

                      <Box sx={{ gridArea: 'actions', display: 'flex' }}>
                        <Tooltip title="Edit">
                          <span>
                            <IconButton size="small" aria-label={`Edit ${debt.name}`} disabled={readOnly} onClick={() => onEdit(debt)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <span>
                            <IconButton size="small" aria-label={`Delete ${debt.name}`} disabled={readOnly} onClick={() => onDelete(debt)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}
                </Draggable>
              );
            })}
            {drop.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}
