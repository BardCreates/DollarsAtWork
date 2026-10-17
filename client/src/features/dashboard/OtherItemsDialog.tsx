import { useEffect, useState } from 'react';
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
});
type FormValues = z.infer<typeof schema>;

const blank: FormValues = { name: '', kind: 'Asset', type: 'Home', value: '' };

/** Things owned or owed that aren't goals, debts or investment accounts: a home, a car, a family loan. */
export function OtherItemsDialog({ open, items, onClose }: { open: boolean; items: OtherItem[]; onClose: () => void }) {
  const add = useAddOtherItem();
  const save = useSaveOtherItem();
  const remove = useDeleteOtherItem();
  const [editing, setEditing] = useState<OtherItem | null>(null);
  const saving = editing ? save : add;

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  const startOver = (item: OtherItem | null) => {
    add.reset();
    save.reset();
    setEditing(item);
    reset(item ? { name: item.name, kind: item.kind, type: item.type, value: String(item.value) } : blank);
  };

  useEffect(() => {
    if (open) startOver(null);
  }, [open]);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const onSubmit = handleSubmit((values) => {
    const item = { name: values.name, kind: values.kind, type: values.type, value: parseMoneyInput(values.value) ?? 0 };
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
