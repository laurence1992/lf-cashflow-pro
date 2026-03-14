import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfile, formatAmount, Currency } from '@/hooks/useProfile';
import { format } from 'date-fns';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { data: transactions } = useTransactions();
  const { data: profile } = useProfile();
  const currency = (profile?.currency as Currency) || 'USD';

  const dayTransactions = useMemo(() => {
    if (!selectedDate || !transactions) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return transactions.filter((t) => t.date === dateStr);
  }, [selectedDate, transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Calendar</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card rounded-lg p-4">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="pointer-events-auto w-full"
          />
        </div>

        <div className="surface-card rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
          </h3>
          {dayTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions on this date</p>
          ) : (
            <div className="space-y-2">
              {dayTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md p-3 bg-accent/30">
                  <div>
                    <p className="text-sm text-foreground">{t.note || t.categories?.name || 'Transaction'}</p>
                    <p className="text-xs text-muted-foreground">{t.categories?.name}</p>
                  </div>
                  <span className={`font-mono-finance text-sm font-medium ${t.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatAmount(Number(t.amount), currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CalendarPage;
