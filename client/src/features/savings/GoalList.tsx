import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Box, Chip, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { formatMonthFromNow, localToday } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { repeatChoices, type Goal, type GoalOutlook } from './savings';

interface GoalListProps {
  goals: Goal[];
  outlooks: GoalOutlook[];
  /** Show each goal's share (Percent mode). */
  showShares: boolean;
  readOnly: boolean;
  onReorder: (ids: string[]) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalList({ goals, outlooks, showShares, readOnly, onReorder, onEdit, onDelete }: GoalListProps) {
  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    const ids = goals.map((g) => g.id);
    const [moved] = ids.splice(source.index, 1);
    ids.splice(destination.index, 0, moved);
    onReorder(ids);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="goals">
        {(drop) => (
          <Box ref={drop.innerRef} {...drop.droppableProps} sx={{ borderTop: 1, borderColor: 'divider' }}>
            {goals.map((goal, index) => (
              <Draggable key={goal.id} draggableId={goal.id} index={index} isDragDisabled={readOnly}>
                {(drag, snapshot) => (
                  <Box
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                      alignItems: 'start',
                      columnGap: 1.5,
                      px: { xs: 0.5, sm: 1 },
                      py: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: snapshot.isDragging ? 'background.paper' : 'transparent',
                      boxShadow: snapshot.isDragging ? 8 : 0,
                    }}
                  >
                    <Box
                      {...drag.dragHandleProps}
                      aria-label={`Move ${goal.name}`}
                      sx={{ display: 'flex', pt: 0.25, color: readOnly ? 'text.disabled' : 'text.secondary', cursor: readOnly ? 'default' : 'grab' }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </Box>

                    <GoalSummary goal={goal} outlook={outlooks[index]} showShare={showShares} />

                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Edit or update balance">
                        <span>
                          <IconButton size="small" aria-label={`Edit ${goal.name}`} disabled={readOnly} onClick={() => onEdit(goal)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <span>
                          <IconButton size="small" aria-label={`Delete ${goal.name}`} disabled={readOnly} onClick={() => onDelete(goal)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
              </Draggable>
            ))}
            {drop.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}

function GoalSummary({ goal, outlook, showShare }: { goal: Goal; outlook: GoalOutlook; showShare: boolean }) {
  const percent = goal.targetAmount > 0 ? Math.min(100, (goal.currentBalance / goal.targetAmount) * 100) : 100;
  const sinking = goal.repeatMonths !== null;
  // A sinking fund is never "done": it's ready for the next bill, then fills again.
  const full = outlook.fullMonth === 0 && !sinking;
  const ready = outlook.fullMonth === 0 && sinking;
  const every = repeatChoices.find((choice) => choice.months === goal.repeatMonths)?.label.toLowerCase() ?? `every ${goal.repeatMonths} months`;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {goal.name}
        </Typography>
        {full && <Chip size="small" color="success" label="Done" />}
        {ready && <Chip size="small" color="success" label="Ready for the bill" />}
        {!full && !ready && outlook.deadline?.onTrack && <Chip size="small" color="success" variant="outlined" label="On track" />}
        {!full && !ready && outlook.deadline && !outlook.deadline.onTrack && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={
              outlook.deadline.months <= 0
                ? !goal.repeatMonths && goal.targetDate !== null && goal.targetDate < localToday()
                  ? 'Target date has passed'
                  : `Due this month: ${formatMoney(Math.ceil(Math.max(0, goal.targetAmount - goal.currentBalance)))} to go`
                : `Needs about ${formatMoney(Math.ceil(outlook.deadline.extraNeeded))}/month more`
            }
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(goal.currentBalance)} of {formatMoney(goal.targetAmount)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Math.floor(percent)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={full ? 'success' : 'primary'}
        aria-label={`${goal.name} progress`}
        sx={{ height: 8, borderRadius: 4 }}
      />

      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
        {full
          ? 'Done. Every dollar made it.'
          : sinking
            ? [
                `Bill ${every}, next due ${formatMonthFromNow(outlook.deadline?.months ?? 0)}`,
                `${formatMoney(outlook.monthlyNow)}/month now`,
                goal.apy > 0 ? `${goal.apy}% APY` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : [
              `${formatMoney(outlook.monthlyNow)}/month now`,
              showShare ? `${goal.sharePercent}% share` : null,
              goal.apy > 0 ? `${goal.apy}% APY` : null,
              outlook.fullMonth === null ? 'not reached within 40 years' : `done ${formatMonthFromNow(outlook.fullMonth)}`,
              goal.targetDate ? `wanted by ${formatMonthFromNow(outlook.deadline?.months ?? 0)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
      </Typography>
    </Box>
  );
}
