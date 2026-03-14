import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddTransactionDialog = ({ open, onOpenChange }: Props) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly'>('monthly');

  const { data: categories } = useCategories();
  const addTransaction = useAddTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    try {
      await addTransaction.mutateAsync({
        amount: parseFloat(amount),
        type,
        category_id: categoryId,
        note: note || undefined,
        date,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : undefined,
      });
      toast.success('Transaction added');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setAmount('');
    setCategoryId('');
    setNote('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRecurring(false);
    setType('expense');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                type === 'expense' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                type === 'income' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border-border bg-background text-2xl font-mono-finance text-primary text-center h-14"
            required
          />

          {/* Category */}
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-foreground">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Note */}
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground"
          />

          {/* Date */}
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-border bg-background text-foreground"
          />

          {/* Recurring */}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm text-foreground">Recurring</span>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          {isRecurring && (
            <Select value={recurringInterval} onValueChange={(v) => setRecurringInterval(v as 'daily' | 'weekly' | 'monthly')}>
              <SelectTrigger className="border-border bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="daily" className="text-foreground">Daily</SelectItem>
                <SelectItem value="weekly" className="text-foreground">Weekly</SelectItem>
                <SelectItem value="monthly" className="text-foreground">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            type="submit"
            disabled={addTransaction.isPending}
            className="w-full bg-primary text-primary-foreground font-bold hover:bg-gold-glow active:scale-95 transition-all"
          >
            {addTransaction.isPending ? 'Saving...' : 'Save Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
