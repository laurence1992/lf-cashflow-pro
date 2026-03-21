import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useCategories, useAddCategory } from '@/hooks/useCategories';
import { useProfile, Currency, currencySymbols } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Mic, MicOff, Check, X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OTHER_SENTINEL = '__other__';

const CURRENCY_WORDS: Record<string, Currency> = {
  euro: 'EUR', euros: 'EUR', eur: 'EUR',
  dollar: 'USD', dollars: 'USD', usd: 'USD', buck: 'USD', bucks: 'USD',
  yuan: 'CNY', cny: 'CNY', renminbi: 'CNY', rmb: 'CNY',
};

const CATEGORY_MAP: Record<string, string> = {
  beer: 'Social', pint: 'Social', pub: 'Social', drinks: 'Social', drink: 'Social', bar: 'Social', wine: 'Social', cocktail: 'Social',
  food: 'Food', lunch: 'Food', dinner: 'Food', breakfast: 'Food', restaurant: 'Food', takeaway: 'Food', meal: 'Food',
  groceries: 'Food', grocery: 'Food', snack: 'Food', coffee: 'Food', cafe: 'Food',
  taxi: 'Transport', uber: 'Transport', bus: 'Transport', train: 'Transport', metro: 'Transport', gas: 'Transport', fuel: 'Transport', petrol: 'Transport', transport: 'Transport', travel: 'Transport', flight: 'Transport',
  gym: 'Fitness', fitness: 'Fitness', workout: 'Fitness', exercise: 'Fitness', sport: 'Fitness', sports: 'Fitness',
  shopping: 'Shopping', shop: 'Shopping', clothes: 'Shopping', clothing: 'Shopping', shoes: 'Shopping', amazon: 'Shopping',
  bills: 'Bills', bill: 'Bills', rent: 'Bills', electricity: 'Bills', water: 'Bills', internet: 'Bills', phone: 'Bills',
  movie: 'Entertainment', movies: 'Entertainment', cinema: 'Entertainment', netflix: 'Entertainment', entertainment: 'Entertainment', game: 'Entertainment', games: 'Entertainment', spotify: 'Entertainment',
  salary: 'Salary', pay: 'Salary', wage: 'Salary', income: 'Salary',
  gift: 'Gift', gifts: 'Gift', present: 'Gift',
  subscription: 'Subscriptions',
};

interface ParsedVoice {
  amount: string | null;
  currency: Currency;
  categoryName: string;
  categoryId: string | null;
}

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

function wordsToNumbers(text: string): string {
  let result = text;
  for (const [word, num] of Object.entries(WORD_TO_NUM)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(num));
  }
  return result;
}

function parseSpeech(
  text: string,
  categories: Array<{ id: string; name: string }> | undefined,
  defaultCurrency: Currency
): ParsedVoice {
  const lower = wordsToNumbers(text.toLowerCase().trim());
  const origWords = text.toLowerCase().trim().split(/\s+/);
  const words = lower.split(/\s+/);

  // Extract amount
  const numMatch = lower.match(/(\d+(?:[.,]\d+)?)/);
  const amount = numMatch ? numMatch[1].replace(',', '.') : null;

  // Extract currency
  let currency: Currency = defaultCurrency;
  for (const word of words) {
    if (CURRENCY_WORDS[word]) {
      currency = CURRENCY_WORDS[word];
      break;
    }
  }

  // Extract category — first try hardcoded map
  let categoryName = 'Other';
  let matched = false;
  for (const word of origWords) {
    if (CATEGORY_MAP[word]) {
      categoryName = CATEGORY_MAP[word];
      matched = true;
      break;
    }
  }

  // If no hardcoded match, check user's custom categories
  if (!matched && categories) {
    const origLower = text.toLowerCase().trim();
    for (const cat of categories) {
      const catLower = cat.name.toLowerCase();
      if (origWords.includes(catLower) || origLower.includes(catLower)) {
        categoryName = cat.name;
        matched = true;
        break;
      }
    }
  }

  // Check for income keywords
  if (origWords.some(w => ['salary', 'income', 'earned', 'wage', 'pay'].includes(w))) {
    categoryName = 'Salary';
  }

  // Find matching category ID
  let categoryId: string | null = null;
  if (categories) {
    const found = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (found) {
      categoryId = found.id;
    }
  }

  console.log('[VoiceParse]', { amount, currency, categoryName, categoryId, rawText: text });

  return { amount, currency, categoryName, categoryId };
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
  const formRef = useRef<HTMLFormElement>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceDetection, setVoiceDetection] = useState<ParsedVoice & { rawText: string } | null>(null);

  useEffect(() => {
    if (open) setTxCurrency(defaultCurrency);
  }, [open, defaultCurrency]);

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

  const confirmVoiceDetection = () => {
    if (!voiceDetection) return;
    console.log('[VoiceConfirm]', voiceDetection);
    if (voiceDetection.amount) setAmount(voiceDetection.amount);
    setTxCurrency(voiceDetection.currency);

    if (voiceDetection.categoryId) {
      setCategoryId(voiceDetection.categoryId);
      setIsCreatingCategory(false);
      setNewCategoryName('');
    } else {
      // No exact match — try "Other" category as fallback
      const otherCat = categories?.find(c => c.name.toLowerCase() === 'other');
      if (otherCat) {
        setCategoryId(otherCat.id);
      }
      setIsCreatingCategory(false);
      setNewCategoryName('');
    }

    // Check for income
    const lower = voiceDetection.rawText.toLowerCase();
    if (['salary', 'income', 'earned', 'wage'].some(w => lower.includes(w))) {
      setType('income');
    }
    setVoiceDetection(null);
  };

  const cancelVoiceDetection = () => {
    setVoiceDetection(null);
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
    setSpeechError(null);
    setVoiceDetection(null);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      if (confidence < 0.4) {
        setSpeechError("Didn't catch that, try again");
        setIsListening(false);
        return;
      }

      const parsed = parseSpeech(transcript, categories, defaultCurrency);
      setVoiceDetection({ ...parsed, rawText: transcript });
      setIsListening(false);
    };

    recognition.onerror = () => {
      setSpeechError("Didn't catch that, try again");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, categories, defaultCurrency]);

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
    setSpeechError(null);
    setVoiceDetection(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Transaction</DialogTitle>
        </DialogHeader>

        {/* Voice Input */}
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
            {isListening ? 'Listening...' : 'Tap to speak — e.g. "5 euro on beer"'}
          </p>

          {/* Voice detection confirmation */}
          {voiceDetection && (
            <div className="w-full rounded-lg border border-primary/40 bg-primary/10 p-3 space-y-2">
              <p className="text-xs text-muted-foreground text-center">Detected:</p>
              <p className="text-lg font-bold text-center text-foreground font-mono-finance">
                {currencySymbols[voiceDetection.currency]}
                {voiceDetection.amount || '?'} — {voiceDetection.categoryName}
              </p>
              <p className="text-[11px] text-muted-foreground text-center italic">
                "{voiceDetection.rawText}"
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={confirmVoiceDetection}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-gold-glow"
                  size="sm"
                >
                  <Check size={16} className="mr-1" /> Confirm
                </Button>
                <Button
                  type="button"
                  onClick={cancelVoiceDetection}
                  variant="outline"
                  className="flex-1 border-border text-muted-foreground"
                  size="sm"
                >
                  <X size={16} className="mr-1" /> Cancel
                </Button>
              </div>
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
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
