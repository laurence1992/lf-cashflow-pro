import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { Currency, formatAmount } from '@/hooks/useProfile';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const MonthlyBreakdown = ({ currency }: { currency: Currency }) => {
  const { data: transactions } = useTransactions();

  const monthlyBreakdown = useMemo(() => {
    if (!transactions) return [];
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthTx = transactions.filter((t) => {
        const td = new Date(t.date);
        return td >= start && td <= end;
      });
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      months.push({ label: format(d, 'MMM yyyy'), income, expenses, net: income - expenses });
    }
    return months;
  }, [transactions]);

  if (monthlyBreakdown.every((m) => m.income === 0 && m.expenses === 0)) {
    return (
      <div className="surface-card rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Monthly Breakdown</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No transaction data yet</p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Monthly Breakdown</h3>
      <div className="space-y-2">
        {monthlyBreakdown.map((m) => (
          <div key={m.label} className="flex items-center justify-between rounded-md p-3 bg-accent/30">
            <span className="text-sm text-foreground">{m.label}</span>
            <div className="flex gap-4 text-xs font-mono-finance">
              <span className="text-primary">+{formatAmount(m.income, currency)}</span>
              <span className="text-foreground">-{formatAmount(m.expenses, currency)}</span>
              <span className={m.net >= 0 ? 'text-primary' : 'text-destructive'}>
                {m.net >= 0 ? '+' : ''}{formatAmount(m.net, currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyBreakdown;
