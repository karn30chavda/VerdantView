export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function calculateSettlements(
  members: string[],
  expenses: { payerName: string; amount: number }[],
): Settlement[] {
  if (members.length === 0) return [];

  // 1. Calculate total spent by each member
  const memberTotals: Record<string, number> = {};
  members.forEach((m) => (memberTotals[m] = 0));
  expenses.forEach((e) => {
    if (memberTotals[e.payerName] !== undefined) {
      memberTotals[e.payerName] += e.amount;
    }
  });

  // 2. Calculate average
  const totalTripExpense = Object.values(memberTotals).reduce(
    (a, b) => a + b,
    0,
  );
  const average = totalTripExpense / members.length;

  // 3. Calculate balances (Spent - Average)
  // Positive: Owed money, Negative: Owes money
  const balances = members.map((name) => ({
    name,
    balance: memberTotals[name] - average,
  }));

  // 4. Split into debtors and creditors
  let debtors = balances
    .filter((b) => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance); // Most negative first
  let creditors = balances
    .filter((b) => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance); // Most positive first

  const settlements: Settlement[] = [];

  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const amountToPay = Math.min(Math.abs(debtor.balance), creditor.balance);

    if (amountToPay > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: amountToPay,
      });
    }

    debtor.balance += amountToPay;
    creditor.balance -= amountToPay;

    if (Math.abs(debtor.balance) < 0.01) dIndex++;
    if (Math.abs(creditor.balance) < 0.01) cIndex++;
  }

  return settlements;
}
