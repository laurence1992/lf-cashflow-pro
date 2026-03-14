import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useCategories, useAddCategory } from '@/hooks/useCategories';
import { useProfile, Currency } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OTHER_SENTINEL = '__other__';

const AddTransactionDialog = ({ open, onOpenChange }: Props) => {
  const { data: profile } = useProfile();
  const defaultCurrency = (profile?.currency as Currency) || 'USD';

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [txCurrency, setTxCurrency] = useState<Currency>(defaultCurrency);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const { data: categories } = useCategories();
  const addTransaction = useAddTransaction();
  const addCategory = useAddCategory();

  const handleCategoryChange = (value: string) => {
    if (value === OTHER_SENTINEL) {
      setIsCreatingCategory(true);
      setCategoryId('');
    } else {
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setCategoryId(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      let finalCategoryId = categoryId;

      // If creating a new category, save it first
      if (isCreatingCategory && newCategoryName.trim()) {
        const newCat = await addCategory.mutateAsync({ name: newCategoryName.trim() });
        finalCategoryId = newCat.id;
      }

      if (!finalCategoryId) {
        toast.error('Please select or create a category');
        return;
      }

      await addTransaction.mutateAsync({
        amount: parseFloat(amount),
        type,
        category_id: finalCategoryId,
        note: note || undefined,
        date,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : undefined,
        currency: txCurrency,
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
    setTxCurrency(defaultCurrency);
    setIsCreatingCategory(false);
    setNewCategoryName('');
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

          {/* Amount + Currency */}
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-border bg-background text-2xl font-mono-finance text-primary text-center h-14 flex-1"
              required
            />
            <Select value={txCurrency} onValueChange={(v) => setTxCurrency(v as Currency)}>
              <SelectTrigger className="border-border bg-background text-foreground w-24 h-14 text-lg font-mono-finance">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="EUR" className="text-foreground">€ EUR</SelectItem>
                <SelectItem value="USD" className="text-foreground">$ USD</SelectItem>
                <SelectItem value="CNY" className="text-foreground">¥ CNY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <Select
            value={isCreatingCategory ? OTHER_SENTINEL : categoryId}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="border-border bg-background text-foreground">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-foreground">
                  {cat.name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_SENTINEL} className="text-primary font-medium">
                + Create new category...
              </SelectItem>
            </SelectContent>
          </Select>

          {/* New category name input */}
          {isCreatingCategory && (
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="border-primary/50 bg-background text-foreground placeholder:text-muted-foreground"
              autoFocus
              required
            />
          )}

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
            disabled={addTransaction.isPending || addCategory.isPending}
            className="w-full bg-primary text-primary-foreground font-bold hover:bg-gold-glow active:scale-95 transition-all"
          >
            {addTransaction.isPending || addCategory.isPending ? 'Saving...' : 'Save Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
