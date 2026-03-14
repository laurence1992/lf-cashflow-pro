import { useMemo } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { Currency, formatAmount } from '@/hooks/useProfile';
import { startOfMonth, endOfMonth } from 'date-fns';

const BudgetOverview = ({ currency }: { currency: Currency }) => {
  const { data: budgets } = useBudgets();
  const { data: transactions } = useTransactions();

  const budgetData = useMemo(() => {
    if (!budgets || !transactions) return [];
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    return budgets.map((b) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === b.category_id &&
            new Date(t.date) >= start &&
            new Date(t.date) <= end
        )
        .reduce((s, t) => s + Number(t.amount), 0);
      const pct = b.amount > 0 ? (spent / Number(b.amount)) * 100 : 0;
      return {
        ...b,
        spent,
        pct: Math.min(pct, 100),
        over: pct > 100,
        nearLimit: pct >= 80 && pct <= 100,
      };
    });
  }, [budgets, transactions]);

  if (budgetData.length === 0) {
    return (
      <div className="surface-card rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Budget Tracker</h3>
        <p className="text-center text-sm text-muted-foreground py-8">
          No budgets set. Go to Settings to configure.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Budget Tracker</h3>
      <div className="space-y-4">
        {budgetData.map((b) => (
          <div key={b.id}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-foreground">{(b as any).categories?.name}</span>
              <span className={`font-mono-finance ${b.over ? 'text-destructive' : b.nearLimit ? 'text-primary' : 'text-muted-foreground'}`}>
                {formatAmount(b.spent, currency)} / {formatAmount(Number(b.amount), currency)}
              </span>
            </div>
            <div className="h-[2px] w-full bg-muted/20 overflow-hidden">
              <div
                className={`h-full transition-all ${b.over ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${b.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetOverview;
