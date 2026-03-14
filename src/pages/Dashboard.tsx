import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfile, formatAmount, Currency } from '@/hooks/useProfile';
import { useExchangeRates, convertAmount } from '@/hooks/useExchangeRates';
import { TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react';
import SpendingChart from '@/components/charts/SpendingChart';
import MonthlyBarChart from '@/components/charts/MonthlyBarChart';
import SpendingTrendChart from '@/components/charts/SpendingTrendChart';
import RecentTransactions from '@/components/RecentTransactions';
import BudgetOverview from '@/components/BudgetOverview';
import MonthlyBreakdown from '@/components/MonthlyBreakdown';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, ease: [0.2, 0, 0, 1] as const },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0, 0, 1] as const } },
};

const Dashboard = () => {
  const { data: transactions } = useTransactions();
  const { data: profile } = useProfile();
  const { data: ratesData } = useExchangeRates();
  const currency = (profile?.currency as Currency) || 'USD';

  const stats = useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0, balance: 0, savingsRate: 0 };
    const rates = ratesData?.rates;
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + convertAmount(Number(t.amount), ((t as any).currency as Currency) || 'USD', currency, rates), 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + convertAmount(Number(t.amount), ((t as any).currency as Currency) || 'USD', currency, rates), 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    return { income, expenses, balance, savingsRate };
  }, [transactions, ratesData, currency]);

  const statCards = [
    { label: 'Total Balance', value: formatAmount(stats.balance, currency), icon: Wallet, highlight: true },
    { label: 'Total Income', value: formatAmount(stats.income, currency), icon: TrendingUp, highlight: false },
    { label: 'Total Expenses', value: formatAmount(stats.expenses, currency), icon: TrendingDown, highlight: false },
    { label: 'Savings Rate', value: `${stats.savingsRate.toFixed(1)}%`, icon: Percent, highlight: false },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.h1 variants={itemVariants} className="text-2xl font-bold tracking-tight text-foreground">
        Dashboard
      </motion.h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            variants={itemVariants}
            className={`surface-card rounded-lg p-4 ${s.highlight ? 'gold-glow' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.highlight ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-lg font-mono-finance font-bold ${s.highlight ? 'text-primary' : 'text-foreground'}`}>
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <SpendingChart transactions={transactions || []} currency={currency} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <MonthlyBarChart transactions={transactions || []} currency={currency} />
        </motion.div>
      </div>

      {/* Trend + Budget */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <SpendingTrendChart transactions={transactions || []} currency={currency} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <BudgetOverview currency={currency} />
        </motion.div>
      </div>

      {/* Monthly Breakdown */}
      <motion.div variants={itemVariants}>
        <MonthlyBreakdown currency={currency} />
      </motion.div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants}>
        <RecentTransactions transactions={transactions || []} currency={currency} />
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
