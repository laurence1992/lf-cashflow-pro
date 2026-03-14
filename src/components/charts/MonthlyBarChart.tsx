import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Currency, formatAmount, currencySymbols } from '@/hooks/useProfile';

interface Transaction {
  amount: number;
  type: string;
  date: string;
}

const MonthlyBarChart = ({ transactions, currency }: { transactions: Transaction[]; currency: Currency }) => {
  const data = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthTx = transactions.filter((t) => {
        const td = new Date(t.date);
        return td >= start && td <= end;
      });
      months.push({
        month: format(d, 'MMM'),
        income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expenses: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return months;
  }, [transactions]);

  return (
    <div className="surface-card rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Income vs Expenses</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 11 }}
              tickFormatter={(v) => `${currencySymbols[currency]}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={50} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md bg-background border border-primary/20 p-2 text-xs font-mono-finance">
                    <p className="text-muted-foreground mb-1">{label}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey as string} style={{ color: p.color }}>
                        {p.dataKey === 'income' ? 'Income' : 'Expenses'}: {formatAmount(p.value as number, currency)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Bar dataKey="income" fill="hsl(40, 100%, 39%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenses" fill="#ffffff" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyBarChart;
