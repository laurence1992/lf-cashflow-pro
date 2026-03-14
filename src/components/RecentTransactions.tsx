import { format } from 'date-fns';
import { Currency, formatAmount } from '@/hooks/useProfile';
import { Trash2 } from 'lucide-react';
import { useDeleteTransaction } from '@/hooks/useTransactions';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  note: string | null;
  date: string;
  is_recurring: boolean;
  categories: { name: string; icon: string | null } | null;
}

const RecentTransactions = ({ transactions, currency }: { transactions: Transaction[]; currency: Currency }) => {
  const deleteTransaction = useDeleteTransaction();
  const recent = transactions.slice(0, 10);

  if (recent.length === 0) {
    return (
      <div className="surface-card rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Transactions</h3>
        <p className="text-center text-sm text-muted-foreground py-8">
          The vault is empty. Log your first transaction to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Transactions</h3>
      <div className="space-y-1">
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-md p-3 hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                {t.categories?.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">
                  {t.note || t.categories?.name || 'Transaction'}
                  {t.is_recurring && <span className="ml-1 text-xs text-muted-foreground">↻</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.categories?.name} · {format(new Date(t.date), 'MMM d')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;
