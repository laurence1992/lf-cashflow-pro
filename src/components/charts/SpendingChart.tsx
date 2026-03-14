import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { Currency, formatAmount } from '@/hooks/useProfile';

interface Transaction {
  amount: number;
  type: string;
  categories: { name: string; icon: string | null } | null;
}

const COLORS = ['hsl(40, 100%, 39%)', '#ffffff', '#a3a3a3', '#737373', '#525252', '#404040', '#d4d4d4', '#e5e5e5', '#171717'];

const SpendingChart = ({ transactions, currency }: { transactions: Transaction[]; currency: Currency }) => {
  const data = useMemo(() => {
    const byCategory: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const name = t.categories?.name || 'Other';
        byCategory[name] = (byCategory[name] || 0) + Number(t.amount);
      });
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="surface-card rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Spending by Category</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No expenses logged yet</p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Spending by Category</h3>
      <div className="flex items-center gap-4">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="65%" outerRadius="95%" dataKey="value" stroke="none">
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-md bg-background border border-primary/20 p-2 text-xs">
                      <p className="text-foreground font-medium">{payload[0].name}</p>
                      <p className="font-mono-finance text-primary">{formatAmount(payload[0].value as number, currency)}</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="font-mono-finance text-foreground">{formatAmount(d.value, currency)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpendingChart;
