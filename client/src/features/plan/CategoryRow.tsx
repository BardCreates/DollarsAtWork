import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Box, ButtonBase, IconButton, Link, Popover, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { MoneyField } from '../../components/MoneyField';
import { formatPercent } from '../../lib/money';
import { categoryColors } from '../../theme';
import { moduleLinks, type Category, type CategoryChanges } from './plan';

interface CategoryRowProps {
  category: Category;
  index: number;
  income: number;
  readOnly: boolean;
  onChange: (changes: CategoryChanges) => void;
  onDelete: () => void;
}

/** One line of the plan: drag handle, color, name, amount, share of income, delete. */
export function CategoryRow({ category, index, income, readOnly, onChange, onDelete }: CategoryRowProps) {
  return (
    <Draggable draggableId={category.id} index={index} isDragDisabled={readOnly}>
      {(drag, snapshot) => (
        <Box
          ref={drag.innerRef}
          {...drag.draggableProps}
          sx={{
            display: 'grid',
            alignItems: 'center',
            columnGap: 1,
            rowGap: 1,
            px: { xs: 0.5, sm: 1 },
            py: 1.25,
            borderBottom: 1,
            borderColor: 'divider',
            borderRadius: snapshot.isDragging ? 2 : 0,
            bgcolor: snapshot.isDragging ? 'background.paper' : 'transparent',
            boxShadow: snapshot.isDragging ? 8 : 0,
            gridTemplateColumns: { xs: 'auto auto minmax(0, 1fr) auto', sm: 'auto auto minmax(0, 1fr) 150px 64px 40px' },
            gridTemplateAreas: {
              xs: '"handle color name actions" ". . amount share"',
              sm: '"handle color name amount share actions"',
            },
          }}
        >
          <Box
            {...drag.dragHandleProps}
            aria-label={`Move ${category.name}`}
            sx={{ gridArea: 'handle', display: 'flex', color: readOnly ? 'text.disabled' : 'text.secondary', cursor: readOnly ? 'default' : 'grab' }}
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>

          <Box sx={{ gridArea: 'color', display: 'flex' }}>
            <ColorPicker name={category.name} color={category.color} disabled={readOnly} onPick={(color) => onChange({ color })} />
          </Box>

          <Box sx={{ gridArea: 'name', minWidth: 0 }}>
            {category.isBuiltIn ? (
              <BuiltInName category={category} />
            ) : (
              <NameField name={category.name} disabled={readOnly} onCommit={(name) => onChange({ name })} />
            )}
          </Box>

          <Box sx={{ gridArea: 'amount' }}>
            <MoneyField
              value={category.amount}
              percentOf={income}
              ariaLabel={`${category.name} amount`}
              disabled={readOnly}
              onCommit={(amount) => onChange({ amount })}
            />
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ gridArea: 'share', textAlign: 'right', minWidth: 52, fontVariantNumeric: 'tabular-nums' }}
          >
            {formatPercent(category.amount, income)}
          </Typography>

          <Box sx={{ gridArea: 'actions', display: 'flex', justifyContent: 'flex-end' }}>
            {category.isBuiltIn ? (
              <Tooltip title={`${category.name} is built in. It can't be renamed or deleted.`}>
                <Box sx={{ display: 'flex', p: 1, color: 'text.disabled' }}>
                  <LockOutlinedIcon fontSize="small" aria-label="Built in" />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Delete">
                <span>
                  <IconButton size="small" aria-label={`Delete ${category.name}`} disabled={readOnly} onClick={onDelete}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}
    </Draggable>
  );
}

function BuiltInName({ category }: { category: Category }) {
  const module = category.kind === 'Custom' ? undefined : moduleLinks[category.kind];
  return (
    <Box sx={{ pl: 1.75 }}>
      <Typography sx={{ fontWeight: 600 }} noWrap>
        {category.name}
      </Typography>
      {module && (
        <Link component={RouterLink} to={module.to} variant="caption" underline="hover">
          {module.label}
        </Link>
      )}
    </Box>
  );
}

/** Saves on blur or Enter. An emptied box goes back to the old name. */
function NameField({ name, disabled, onCommit }: { name: string; disabled: boolean; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);

  const finish = () => {
    const trimmed = draft?.trim();
    setDraft(null);
    if (trimmed && trimmed !== name) onCommit(trimmed);
  };

  return (
    <TextField
      size="small"
      disabled={disabled}
      value={draft ?? name}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
      }}
      slotProps={{ htmlInput: { maxLength: 60, 'aria-label': 'Category name' } }}
    />
  );
}

function ColorPicker({ name, color, disabled, onPick }: { name: string; color: string; disabled: boolean; onPick: (color: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <ButtonBase
        aria-label={`Change color of ${name}`}
        disabled={disabled}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center' }}
      >
        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: color }} />
      </ButtonBase>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 32px)', gap: 1, p: 1.5 }}>
          {categoryColors.map((option) => (
            <ButtonBase
              key={option}
              aria-label={`Color ${option}`}
              onClick={() => {
                setAnchor(null);
                if (option !== color) onPick(option);
              }}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: option,
                outline: option.toLowerCase() === color.toLowerCase() ? 2 : 0,
                outlineStyle: 'solid',
                outlineColor: 'text.primary',
                outlineOffset: 2,
              }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
}
