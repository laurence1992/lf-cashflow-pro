import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from 'recharts';
import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Currency, formatAmount, currencySymbols } from '@/hooks/useProfile';

interface Transaction {
  amount: number;
  type: string;
  date: string;
}

const SpendingTrendChart = ({ transactions, currency }: { transactions: Transaction[]; currency: Currency }) => {
  const data = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const spending = transactions
        .filter((t) => t.type === 'expense' && new Date(t.date) >= start && new Date(t.date) <= end)
        .reduce((s, t) => s + Number(t.amount), 0);
      months.push({ month: format(d, 'MMM'), spending });
    }
    return months;
  }, [transactions]);

  return (
    <div className="surface-card rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Spending Trend</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(40, 100%, 39%)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(40, 100%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#737373', fontSize: 11 }}
              tickFormatter={(v) => `${currencySymbols[currency]}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={50} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md bg-background border border-primary/20 p-2 text-xs font-mono-finance">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="text-primary">{formatAmount(payload[0].value as number, currency)}</p>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="spending" stroke="hsl(40, 100%, 39%)" strokeWidth={2.5} fill="url(#goldGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendingTrendChart;
