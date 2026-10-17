import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { muiField } from '../../components/formHelpers';
import { ApiError, errorMessage } from '../../api/client';
import { moneyInputProblem, parseMoneyInput } from '../../lib/money';
import { categoryColors } from '../../theme';
import { useAddCategory, type Category } from './plan';

const schema = z.object({
  name: z.string().trim().min(1, 'Give the category a name.').max(60, 'Keep the name to 60 characters or fewer.'),
  amount: z.string(),
});
type FormValues = z.infer<typeof schema>;

/** The first palette color no category uses yet; once all are used, cycle through them. */
function nextColor(categories: Category[]): string {
  const used = new Set(categories.map((c) => c.color.toLowerCase()));
  return categoryColors.find((color) => !used.has(color.toLowerCase())) ?? categoryColors[categories.length % categoryColors.length];
}

export function AddCategoryForm({ categories, income, disabled }: { categories: Category[]; income: number; disabled: boolean }) {
  const add = useAddCategory();
  const { register, handleSubmit, reset, setError, setFocus, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', amount: '' },
  });

  const serverError = add.error instanceof ApiError ? add.error : undefined;
  const nameError = errors.name?.message ?? serverError?.fieldErrors('name')[0] ?? (add.isError ? errorMessage(add.error) : undefined);
  const amountError = errors.amount?.message ?? serverError?.fieldErrors('amount')[0];

  const onSubmit = handleSubmit(({ name, amount }) => {
    const dollars = parseMoneyInput(amount, income);
    if (dollars === null) {
      setError('amount', { message: moneyInputProblem(amount, income) ?? 'Enter dollars or a percent, like 500 or 10%.' });
      return;
    }
    add.mutate(
      { name, amount: dollars, color: nextColor(categories) },
      {
        onSuccess: () => {
          reset();
          setFocus('name');
        },
      },
    );
  });

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      noValidate
      sx={{
        display: 'grid',
        gap: 1,
        alignItems: 'start',
        pt: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 150px auto' },
      }}
    >
      <TextField
        size="small"
        label="New category"
        placeholder="Rent, groceries…"
        disabled={disabled}
        {...muiField(register, 'name')}
        error={!!nameError}
        helperText={nameError}
        slotProps={{ htmlInput: { maxLength: 60 } }}
      />
      <TextField
        size="small"
        label="Amount"
        placeholder="$ or %"
        disabled={disabled}
        {...muiField(register, 'amount')}
        error={!!amountError}
        helperText={amountError}
        slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } } }}
      />
      <Button type="submit" variant="outlined" startIcon={<AddIcon />} disabled={disabled || add.isPending} sx={{ height: 40 }}>
        Add category
      </Button>
    </Box>
  );
}
