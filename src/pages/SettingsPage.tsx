import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, Currency } from '@/hooks/useProfile';
import { useCategories, useAddCategory } from '@/hooks/useCategories';
import { useBudgets, useUpsertBudget } from '@/hooks/useBudgets';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatAmount } from '@/hooks/useProfile';

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();
  const { data: budgets } = useBudgets();
  const addCategory = useAddCategory();
  const upsertBudget = useUpsertBudget();
  const currency = (profile?.currency as Currency) || 'USD';

  const [newCategory, setNewCategory] = useState('');
  const [budgetCat, setBudgetCat] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const handleCurrencyChange = async (val: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ currency: val }).eq('user_id', user.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Currency updated');
      window.location.reload();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await addCategory.mutateAsync({ name: newCategory.trim() });
      toast.success('Category added');
      setNewCategory('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCat || !budgetAmount) return;
    const now = new Date();
    try {
      await upsertBudget.mutateAsync({
        category_id: budgetCat,
        amount: parseFloat(budgetAmount),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      toast.success('Budget set');
      setBudgetCat('');
      setBudgetAmount('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    if (!transactions) return [];
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthTx = transactions.filter((t) => {
        const td = new Date(t.date);
        return td >= start && td <= end;
      });
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      months.push({ label: format(d, 'MMM yyyy'), income, expenses, net: income - expenses });
    }
    return months;
  }, [transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>

      {/* Currency */}
      <div className="surface-card rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Currency</h3>
        <Select value={profile?.currency || 'USD'} onValueChange={handleCurrencyChange}>
          <SelectTrigger className="w-48 border-border bg-background text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="USD" className="text-foreground">$ US Dollar</SelectItem>
            <SelectItem value="EUR" className="text-foreground">€ Euro</SelectItem>
            <SelectItem value="CNY" className="text-foreground">¥ Chinese Yuan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Categories */}
      <div className="surface-card rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Custom Categories</h3>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border-border bg-background text-foreground"
          />
          <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-gold-glow">
            Add
          </Button>
        </form>
        <div className="flex flex-wrap gap-2 mt-2">
          {categories?.filter((c) => !c.is_default).map((c) => (
            <span key={c.id} className="rounded-md border border-border px-2 py-1 text-xs text-foreground">
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Budget Settings */}
      <div className="surface-card rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Monthly Budgets</h3>
        <form onSubmit={handleSetBudget} className="flex gap-2 flex-wrap">
          <Select value={budgetCat} onValueChange={setBudgetCat}>
            <SelectTrigger className="w-40 border-border bg-background text-foreground">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-foreground">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            className="w-32 border-border bg-background text-foreground"
          />
          <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-gold-glow">
            Set Budget
          </Button>
        </form>
        {budgets && budgets.length > 0 && (
          <div className="space-y-1 mt-2">
            {budgets.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{(b as any).categories?.name}</span>
                <span className="font-mono-finance">{formatAmount(Number(b.amount), currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Breakdown */}
      <div className="surface-card rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Monthly Breakdown</h3>
        <div className="space-y-2">
          {monthlyBreakdown.map((m) => (
            <div key={m.label} className="flex items-center justify-between rounded-md p-3 bg-accent/30">
              <span className="text-sm text-foreground">{m.label}</span>
              <div className="flex gap-4 text-xs font-mono-finance">
                <span className="text-primary">+{formatAmount(m.income, currency)}</span>
                <span className="text-foreground">-{formatAmount(m.expenses, currency)}</span>
                <span className={m.net >= 0 ? 'text-primary' : 'text-destructive'}>
                  {m.net >= 0 ? '+' : ''}{formatAmount(m.net, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="surface-card rounded-lg p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Account</h3>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <Button onClick={signOut} variant="outline" size="sm" className="border-border text-foreground hover:bg-accent">
          Sign Out
        </Button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
