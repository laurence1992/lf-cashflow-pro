import { format } from 'date-fns';
import { Currency, formatAmount, currencySymbols } from '@/hooks/useProfile';
import { useExchangeRates, convertAmount } from '@/hooks/useExchangeRates';
import { Trash2, ArrowRight } from 'lucide-react';
import { useDeleteTransaction } from '@/hooks/useTransactions';

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔', Groceries: '🛒', Transport: '🚗', Shopping: '🛍️',
  Entertainment: '🎬', Health: '💊', Education: '📚', Bills: '📄',
  Salary: '💰', Freelance: '💻', Investment: '📈', Rent: '🏠',
  Utilities: '⚡', Travel: '✈️', Fitness: '🏋️', Subscriptions: '📺',
  Other: '📌',
};

function capitalize(str: string | undefined | null): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCategoryIcon(name: string | undefined): string {
  if (!name) return '📌';
  return CATEGORY_ICONS[name] || '📌';
}

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
  const { data: ratesData } = useExchangeRates();
  const recent = transactions.slice(0, 5);

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
        {recent.map((t) => {
          const catName = t.categories?.name || 'Other';
          const icon = getCategoryIcon(catName);
          const isIncome = t.type === 'income';
          const txCurrency = ((t as any).currency as Currency) || 'USD';
          const originalAmount = Number(t.amount);
          const convertedAmount = convertAmount(originalAmount, txCurrency, currency, ratesData?.rates);
          const showConversion = txCurrency !== currency;

          return (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-md p-3 hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-base">
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">
                    {capitalize(t.note) || capitalize(catName)}
                    {t.is_recurring && <span className="ml-1 text-xs text-muted-foreground">↻</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {capitalize(catName)} · {format(new Date(t.date), 'MMM d')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className={`font-mono-finance text-sm font-medium ${isIncome ? 'text-green-500' : 'text-red-400'}`}>
                    {isIncome ? '+' : '-'}{currencySymbols[txCurrency]}{Math.abs(originalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {showConversion && (
                    <p className="text-[10px] text-muted-foreground font-mono-finance flex items-center justify-end gap-0.5">
                      <ArrowRight size={8} />
                      {formatAmount(convertedAmount, currency)}
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
        })}
      </div>
    </div>
  );
};

export default RecentTransactions;
