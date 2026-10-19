import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { muiField } from '../../components/formHelpers';
import { useGuardedClose } from '../../components/useGuardedClose';
import { ApiError, errorMessage } from '../../api/client';
import { moneyInputText, parseMoneyInput } from '../../lib/money';
import { otherItemTypeLabels, useAddOtherItem, useSaveOtherItem, type OtherItem, type OtherItemType } from '../dashboard/networth';

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
export function parseSignedPercent(text: string): number | null {
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

/** Add something you own (or owe outside the Debt page), or edit one when `item` is given. */
export function AssetDialog({ open, item, onClose }: { open: boolean; item?: OtherItem; onClose: () => void }) {
  const add = useAddOtherItem();
  const save = useSaveOtherItem();
  const saving = item ? save : add;

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });

  // Start from the item being edited (or a blank form) every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    add.reset();
    save.reset();
    reset(item ? { name: item.name, kind: item.kind, type: item.type, value: moneyInputText(item.value), yearlyChange: String(item.yearlyChangePercent) } : blank);
  }, [open, item]);

  // Picking a type on a new item fills in its usual yearly change. Editing never changes a saved rate on its own.
  const type = watch('type');
  const kind = watch('kind');
  const lastType = useRef(type);
  useEffect(() => {
    if (!item && lastType.current !== type) setValue('yearlyChange', String(suggestedChange[type] ?? 0));
    lastType.current = type;
  }, [type, item, setValue]);

  const serverError = saving.error instanceof ApiError ? saving.error : undefined;
  const fieldError = (field: keyof FormValues) => errors[field]?.message ?? serverError?.fieldErrors(field)[0];
  const hasFieldError = (Object.keys(blank) as (keyof FormValues)[]).some((field) => fieldError(field));

  const guardedClose = useGuardedClose(open, isDirty, onClose);

  const onSubmit = handleSubmit((values) => {
    const fields = {
      name: values.name,
      kind: values.kind,
      type: values.type,
      value: parseMoneyInput(values.value) ?? 0,
      yearlyChangePercent: parseSignedPercent(values.yearlyChange) ?? 0,
    };
    if (item) save.mutate({ id: item.id, item: fields }, { onSuccess: onClose });
    else add.mutate(fields, { onSuccess: onClose });
  });

  return (
    <Dialog open={open} onClose={guardedClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle>{item ? `Edit ${item.name}` : 'Add something you own'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saving.isError && !hasFieldError && <Alert severity="error">{errorMessage(saving.error)}</Alert>}
            {/* The boxes are filled by reset() when editing, which the label doesn't see; keep it raised so it never sits on the text. */}
            <TextField
              label="Name"
              placeholder="House, car…"
              autoFocus
              {...muiField(register, 'name')}
              error={!!fieldError('name')}
              helperText={fieldError('name')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="This is something"
                  {...field}
                  error={!!fieldError('kind')}
                  helperText={fieldError('kind') ?? (field.value === 'Liability' ? 'A loan with a monthly payment belongs on the Debt page, where it pays down month by month.' : undefined)}
                >
                  <MenuItem value="Asset">I own</MenuItem>
                  <MenuItem value="Liability">I owe (no monthly payment)</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField select label="Type" {...field} error={!!fieldError('type')} helperText={fieldError('type')}>
                  {itemTypes.map((option) => (
                    <MenuItem key={option} value={option}>
                      {otherItemTypeLabels[option]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label={kind === 'Liability' ? 'Amount owed' : 'Value'}
              placeholder="$"
              {...muiField(register, 'value')}
              error={!!fieldError('value')}
              helperText={fieldError('value') ?? (kind === 'Asset' ? 'What it would sell for today.' : undefined)}
              slotProps={{ htmlInput: { inputMode: 'decimal' }, inputLabel: { shrink: true } }}
            />
            <TextField
              label="Changes by, each year"
              placeholder="%"
              {...muiField(register, 'yearlyChange')}
              error={!!fieldError('yearlyChange')}
              helperText={fieldError('yearlyChange') ?? changeHint[type] ?? '0 keeps the value where it is. Use a minus sign for something that loses value.'}
              slotProps={{ htmlInput: { inputMode: 'decimal' }, inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={guardedClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving.isPending}>
            {item ? 'Save changes' : 'Add it'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
