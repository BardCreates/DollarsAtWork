import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { formatMoney, parseMoneyInput } from '../../lib/money';
import { otherItemTypeLabels, useAddOtherItem, useDeleteOtherItem, useSaveOtherItem, type OtherItem, type OtherItemType } from './networth';

const itemTypes = Object.keys(otherItemTypeLabels) as [OtherItemType, ...OtherItemType[]];

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  kind: z.enum(['Asset', 'Liability']),
  type: z.enum(itemTypes),
  value: z.string().refine((text) => text.trim() !== '' && parseMoneyInput(text) !== null, 'Enter a value in dollars.'),
  yearlyChange: z.string().refine((text) => parseSignedPercent(text) !== null, 'Enter a yearly change between −50% and 50%.'),
});
type FormValues = z.infer<typeof schema>;

/** Reads "3", "-10" or "3%" as a percent from −50 to 50; an empty box means 0. */
function parseSignedPercent(text: string): number | null {
  const cleaned = text.replace(/[\s%]/g, '').replace('−', '-');
  if (cleaned === '') return 0;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const percent = Number(cleaned);
  return Math.abs(percent) <= 50 ? percent : null;
}

/**
 * A starting guess for how an item's value moves each year. Homes: a cautious 3% (US homes have averaged about
 * 4.5% a year since 1975). Cars lose value. Everything else is left flat until the user says otherwise.
 */
const suggestedChange: Partial<Record<OtherItemType, number>> = { Home: 3, Vehicle: -10 };
const changeHint: Partial<Record<OtherItemType, string>> = {
  Home: 'A guess, not a promise. Homes have averaged about 4.5% a year since 1975; 3% is the cautious estimate.',
  Vehicle: 'Cars lose value. −10% a year is typical; a classic you expect to hold its value can be 0.',
};

const blank: FormValues = { name: '', kind: 'Asset', type: 'Home', value: '', yearlyChange: String(suggestedChange.Home) };

/** Things owned or owed that aren't goals, debts or investment accounts: a home, a car, a family loan. */
export function OtherItemsDialog({ open, items, onClose }: { open: boolean; items: OtherItem[]; onClose: () => void }) {
  const add = useAddOtherItem();
  const save = useSaveOtherItem();
  const remove = useDeleteOtherItem();
  const [editing, setEditing] = useState<OtherItem | null>(null);
  const saving = editing ? save : add;

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  const startOver = (item: OtherItem | null) => {
    add.reset();
    save.reset();
    setEditing(item);
    reset(item ? { name: item.name, kind: item.kind, type: item.type, value: String(item.value), yearlyChange: String(item.yearlyChangePercent) } : blank);
  };

  // Picking a type on a new item fills in its usual yearly change. Editing never changes a saved rate on its own.
  const type = watch('type');
  const lastType = useRef(type);
  useEffect(() => {
    if (!editing && lastType.current !== type) setValue('yearlyChange', String(suggestedChange[type] ?? 0));
    lastType.current = type;
  }, [type, editing, setValue]);

  useEffect(() => {
    if (open) startOver(null);
  }, [open]);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const onSubmit = handleSubmit((values) => {
    const item = {
      name: values.name,
      kind: values.kind,
      type: values.type,
      value: parseMoneyInput(values.value) ?? 0,
      yearlyChangePercent: parseSignedPercent(values.yearlyChange) ?? 0,
    };
    const done = { onSuccess: () => startOver(null) };
    if (editing) save.mutate({ id: editing.id, item }, done);
    else add.mutate(item, done);
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Other assets and debts</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Add things that count toward your net worth but aren't a savings goal, a debt on the Debt page or an investment account.
        </Typography>

        {items.length > 0 && (
          <Box sx={{ borderTop: 1, borderColor: 'divider', mb: 3 }}>
            {items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.kind === 'Asset' ? 'You own' : 'You owe'} · {otherItemTypeLabels[item.type]}
                    {item.yearlyChangePercent !== 0 ? ` · ${item.yearlyChangePercent > 0 ? '+' : '−'}${Math.abs(item.yearlyChangePercent)}% a year` : ''}
                  </Typography>
                </Box>
                <Typography color={item.kind === 'Asset' ? 'success.main' : 'error.main'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(item.value)}
                </Typography>
                <IconButton size="small" aria-label={`Edit ${item.name}`} onClick={() => startOver(item)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`Delete ${item.name}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.id, { onSuccess: () => editing?.id === item.id && startOver(null) })}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
        {remove.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage(remove.error)}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          {editing ? `Edit ${editing.name}` : 'Add an item'}
        </Typography>
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {saving.isError && !hasFieldError && (
            <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
              {errorMessage(saving.error)}
            </Alert>
          )}
          {/* The boxes are filled by reset() when editing, which the label doesn't see; keep it raised so it never sits on the text. */}
          <TextField
            size="small"
            label="Name"
            placeholder="House, car…"
            {...muiField(register, 'name')}
            error={!!fieldError('name')}
            helperText={fieldError('name')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            label="Value"
            placeholder="$"
            {...muiField(register, 'value')}
            error={!!fieldError('value')}
            helperText={fieldError('value')}
            slotProps={{ htmlInput: { inputMode: 'decimal' }, inputLabel: { shrink: true } }}
          />
          <Controller
            name="kind"
            control={control}
            render={({ field }) => (
              <TextField select size="small" label="This is something" {...field} error={!!fieldError('kind')} helperText={fieldError('kind')}>
                <MenuItem value="Asset">I own</MenuItem>
                <MenuItem value="Liability">I owe</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField select size="small" label="Type" {...field} error={!!fieldError('type')} helperText={fieldError('type')}>
                {itemTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {otherItemTypeLabels[type]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            size="small"
            label="Changes by, each year"
            placeholder="%"
            {...muiField(register, 'yearlyChange')}
            error={!!fieldError('yearlyChange')}
            helperText={fieldError('yearlyChange') ?? changeHint[type] ?? '0 keeps the value where it is. Use a minus sign for something that loses value.'}
            slotProps={{ htmlInput: { inputMode: 'decimal' }, inputLabel: { shrink: true } }}
            sx={{ gridColumn: '1 / -1' }}
          />
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1 }}>
            <Button type="submit" variant="contained" disabled={saving.isPending}>
              {editing ? 'Save changes' : 'Add item'}
            </Button>
            {editing && (
              <Button color="inherit" onClick={() => startOver(null)}>
                Cancel edit
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
