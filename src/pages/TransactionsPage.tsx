import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useProfile, formatAmount, Currency } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TransactionsPage = () => {
  const { data: transactions } = useTransactions();
  const { data: profile } = useProfile();
  const currency = (profile?.currency as Currency) || 'USD';
  const deleteTransaction = useDeleteTransaction();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t) => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesSearch =
        !search ||
        t.note?.toLowerCase().includes(search.toLowerCase()) ||
        t.categories?.name?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [transactions, search, filterType]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions</h1>

      {/* Filters */}
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
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-32 border-border bg-background text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground">All</SelectItem>
            <SelectItem value="income" className="text-foreground">Income</SelectItem>
            <SelectItem value="expense" className="text-foreground">Expense</SelectItem>
          </SelectContent>
        </Select>
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
          filtered.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                  {t.categories?.name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {t.note || t.categories?.name || 'Transaction'}
                    {t.is_recurring && (
                      <span className="ml-2 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-medium">
                        {t.recurring_interval || 'recurring'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.categories?.name} · {format(new Date(t.date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono-finance text-sm font-medium ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatAmount(Number(t.amount), currency)}
                </span>
                <button
                  onClick={() => deleteTransaction.mutate(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default TransactionsPage;
