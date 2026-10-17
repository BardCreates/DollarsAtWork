/** How often an income source pays, and what that comes to in an average month. Matches the server's IncomeSource. */
export type IncomeFrequency = 'Monthly' | 'TwiceMonthly' | 'Biweekly' | 'Weekly' | 'Yearly' | 'Varies';

export const incomeFrequencies: { value: IncomeFrequency; label: string; amountLabel: string }[] = [
  { value: 'Biweekly', label: 'Every two weeks', amountLabel: 'Each paycheck' },
  { value: 'TwiceMonthly', label: 'Twice a month', amountLabel: 'Each paycheck' },
  { value: 'Weekly', label: 'Every week', amountLabel: 'Each paycheck' },
  { value: 'Monthly', label: 'Once a month', amountLabel: 'Each month' },
  { value: 'Varies', label: 'It varies', amountLabel: 'A careful month' },
  { value: 'Yearly', label: 'Once a year', amountLabel: 'Each year' },
];

/** The average month: 26 biweekly or 52 weekly paychecks spread over 12 months, a yearly amount divided by 12. */
export function monthlyEquivalent(amount: number, frequency: IncomeFrequency): number {
  switch (frequency) {
    case 'TwiceMonthly':
      return amount * 2;
    case 'Biweekly':
      return (amount * 26) / 12;
    case 'Weekly':
      return (amount * 52) / 12;
    case 'Yearly':
      return amount / 12;
    default:
      return amount;
  }
}
