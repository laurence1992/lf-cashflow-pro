import { useState, useCallback } from 'react';
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
import { Mic, MicOff } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OTHER_SENTINEL = '__other__';

// Map spoken currency words to codes
const CURRENCY_WORDS: Record<string, Currency> = {
  euro: 'EUR', euros: 'EUR', eur: 'EUR', '€': 'EUR',
  dollar: 'USD', dollars: 'USD', usd: 'USD', '$': 'USD', buck: 'USD', bucks: 'USD',
  yuan: 'CNY', cny: 'CNY', renminbi: 'CNY', rmb: 'CNY', '¥': 'CNY',
};

// Map spoken category words to category names
const CATEGORY_WORDS: Record<string, string> = {
  food: 'Food', eat: 'Food', eating: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food', meal: 'Food',
  groceries: 'Food', grocery: 'Food', coffee: 'Food', cafe: 'Food', restaurant: 'Food', snack: 'Food',
  transport: 'Transport', taxi: 'Transport', uber: 'Transport', bus: 'Transport', train: 'Transport', gas: 'Transport', fuel: 'Transport', petrol: 'Transport',
  shopping: 'Shopping', shop: 'Shopping', clothes: 'Shopping', clothing: 'Shopping', amazon: 'Shopping',
  entertainment: 'Entertainment', movie: 'Entertainment', movies: 'Entertainment', cinema: 'Entertainment', game: 'Entertainment', games: 'Entertainment',
  health: 'Health', doctor: 'Health', medicine: 'Health', pharmacy: 'Health', hospital: 'Health',
  bills: 'Bills', bill: 'Bills', electricity: 'Bills', water: 'Bills', internet: 'Bills', phone: 'Bills',
  salary: 'Salary', pay: 'Salary', wage: 'Salary', income: 'Salary',
  rent: 'Bills', housing: 'Bills',
  gift: 'Gift', gifts: 'Gift', present: 'Gift',
  travel: 'Transport', flight: 'Transport', hotel: 'Transport',
  beer: 'Social', drinks: 'Social', bar: 'Social', pub: 'Social', wine: 'Social', cocktail: 'Social',
  gym: 'Fitness', workout: 'Fitness', exercise: 'Fitness', sport: 'Fitness', sports: 'Fitness',
  subscription: 'Subscriptions', netflix: 'Subscriptions', spotify: 'Subscriptions',
};

function parseSpeech(text: string, categories: Array<{ id: string; name: string }> | undefined) {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // Extract amount (first number found)
  const numMatch = lower.match(/(\d+(?:[.,]\d+)?)/);
  const amount = numMatch ? numMatch[1].replace(',', '.') : null;

  // Extract currency
  let currency: Currency | null = null;
  for (const word of words) {
    if (CURRENCY_WORDS[word]) {
      currency = CURRENCY_WORDS[word];
      break;
    }
  }

  // Extract category — first try matching against actual user categories
  let categoryId: string | null = null;
  let categoryName: string | null = null;

  if (categories) {
    for (const cat of categories) {
      if (lower.includes(cat.name.toLowerCase())) {
        categoryId = cat.id;
        categoryName = cat.name;
        break;
      }
    }
  }

  // Fallback to keyword mapping
  if (!categoryId && categories) {
    for (const word of words) {
      const mapped = CATEGORY_WORDS[word];
      if (mapped) {
        const found = categories.find((c) => c.name.toLowerCase() === mapped.toLowerCase());
        if (found) {
          categoryId = found.id;
          categoryName = found.name;
          break;
        }
      }
    }
  }

  return { amount, currency, categoryId, categoryName };
}

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

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

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

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    setIsListening(true);
    setSpeechText(null);
    setSpeechError(null);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      setSpeechText(transcript);

      if (confidence < 0.4) {
        setSpeechError("Didn't catch that, try again");
        setIsListening(false);
        return;
      }

      // Parse and fill form
      const parsed = parseSpeech(transcript, categories);

      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.currency) setTxCurrency(parsed.currency);
      if (parsed.categoryId) {
        setCategoryId(parsed.categoryId);
        setIsCreatingCategory(false);
        setNewCategoryName('');
      }

      // Fill note with raw spoken text
      setNote(transcript);

      // Check for income keywords
      const lower = transcript.toLowerCase();
      if (lower.includes('salary') || lower.includes('income') || lower.includes('pay') || lower.includes('earned')) {
        setType('income');
      }

      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setSpeechError("Didn't catch that, try again");
      } else {
        setSpeechError("Didn't catch that, try again");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      let finalCategoryId = categoryId;

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
    setSpeechText(null);
    setSpeechError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Transaction</DialogTitle>
        </DialogHeader>

        {/* Voice Input Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all active:scale-95 ${
              isListening
                ? 'bg-primary animate-pulse shadow-[0_0_20px_hsl(var(--primary)/0.5)]'
                : 'bg-primary hover:bg-gold-glow shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
            }`}
          >
            {isListening ? (
              <MicOff size={22} className="text-primary-foreground" />
            ) : (
              <Mic size={22} className="text-primary-foreground" />
            )}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {isListening ? 'Listening...' : 'Tap to speak — e.g. "50 euro on food"'}
          </p>

          {/* Speech result */}
          {speechText && !speechError && (
            <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Heard:</p>
              <p className="text-sm font-medium text-foreground">"{speechText}"</p>
            </div>
          )}
          {speechError && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-center">
              <p className="text-sm text-destructive">{speechError}</p>
            </div>
          )}
        </div>

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
