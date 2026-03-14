import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useProfile, formatAmount, Currency, currencySymbols } from '@/hooks/useProfile';
import { useExchangeRates, convertAmount } from '@/hooks/useExchangeRates';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Trash2, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔', Groceries: '🛒', Transport: '🚗', Shopping: '🛍️',
  Entertainment: '🎬', Health: '💊', Education: '📚', Bills: '📄',
  Salary: '💰', Freelance: '💻', Investment: '📈', Rent: '🏠',
  Utilities: '⚡', Travel: '✈️', Fitness: '🏋️', Subscriptions: '📺',
  Other: '📌',
};

function getCategoryIcon(name: string | undefined): string {
  if (!name) return '📌';
  return CATEGORY_ICONS[name] || name.charAt(0).toUpperCase();
}

const TransactionsPage = () => {
  const { data: transactions } = useTransactions();
  const { data: profile } = useProfile();
  const displayCurrency = (profile?.currency as Currency) || 'USD';
  const { data: ratesData } = useExchangeRates();
  const deleteTransaction = useDeleteTransaction();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Generate last 12 months for filter
  const monthOptions = useMemo(() => {
    const months: { value: string; label: string }[] = [{ value: 'all', label: 'All Months' }];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy'),
      });
    }
    return months;
  }, []);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t) => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesSearch =
        !search ||
        t.note?.toLowerCase().includes(search.toLowerCase()) ||
        (t.categories as any)?.name?.toLowerCase().includes(search.toLowerCase());
      let matchesMonth = true;
      if (filterMonth !== 'all') {
        const txDate = new Date(t.date);
        const [year, month] = filterMonth.split('-').map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        matchesMonth = txDate >= start && txDate <= end;
      }
      return matchesType && matchesSearch && matchesMonth;
    });
  }, [transactions, search, filterType, filterMonth]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions</h1>

      {/* Filter Bar */}
      <div className="space-y-3">
        {/* Type filter tabs */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>

        {/* Search + Month filter */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-44 border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border max-h-60">
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-foreground">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction List */}
      <div className="surface-card rounded-lg divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {transactions?.length === 0
              ? 'The vault is empty. Log your first transaction to begin.'
              : 'No transactions match your filters.'}
          </p>
        ) : (
          filtered.map((t) => {
            const txCurrency = ((t as any).currency as Currency) || 'USD';
            const originalAmount = Number(t.amount);
            const convertedAmount = convertAmount(originalAmount, txCurrency, displayCurrency, ratesData?.rates);
            const showConversion = txCurrency !== displayCurrency;
            const cat = t.categories as any;
            const catName = cat?.name || 'Other';
            const icon = getCategoryIcon(catName);
            const isIncome = t.type === 'income';

            return (
              <div
                key={t.id}
                className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-base">
                    {icon.length <= 2 ? icon : <span className="text-sm font-bold text-primary">{icon}</span>}
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground font-medium truncate">
                        {t.note || catName}
                      </p>
                      {t.is_recurring && (
                        <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium">
                          {t.recurring_interval || 'recurring'}
                        </span>
                      )}
                      {/* Currency badge */}
                      <span className="inline-block rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono-finance">
                        {txCurrency}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {catName} · {format(new Date(t.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Amount + delete */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`font-mono-finance text-sm font-medium ${isIncome ? 'text-green-500' : 'text-red-400'}`}>
                      {isIncome ? '+' : '-'}{currencySymbols[txCurrency]}{Math.abs(originalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {showConversion && (
                      <p className="text-[10px] text-muted-foreground font-mono-finance flex items-center justify-end gap-0.5">
                        <ArrowRight size={8} />
                        {formatAmount(convertedAmount, displayCurrency)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTransaction.mutate(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default TransactionsPage;
