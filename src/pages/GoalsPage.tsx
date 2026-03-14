import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSavingsGoals, useAddSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal } from '@/hooks/useSavingsGoals';
import { useProfile, formatAmount, Currency } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

const GoalsPage = () => {
  const { data: goals } = useSavingsGoals();
  const { data: profile } = useProfile();
  const currency = (profile?.currency as Currency) || 'USD';
  const addGoal = useAddSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthly, setMonthly] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addGoal.mutateAsync({
        name,
        target_amount: parseFloat(target),
        monthly_contribution: parseFloat(monthly),
      });
      toast.success('Goal created');
      setShowAdd(false);
      setName('');
      setTarget('');
      setMonthly('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getProjection = (goal: { target_amount: number; current_amount: number; monthly_contribution: number }) => {
    const remaining = Number(goal.target_amount) - Number(goal.current_amount);
    if (remaining <= 0) return 'Goal reached!';
    if (Number(goal.monthly_contribution) <= 0) return 'Set a monthly contribution';
    const monthsNeeded = Math.ceil(remaining / Number(goal.monthly_contribution));
    const targetDate = addMonths(new Date(), monthsNeeded);
    return `At your current rate, you will reach this goal by ${format(targetDate, 'MMM d, yyyy')}`;
  };

  const getByDate = (goal: { current_amount: number; monthly_contribution: number }) => {
    const jan1 = new Date(new Date().getFullYear() + 1, 0, 1);
    const monthsUntil = Math.max(0, (jan1.getFullYear() - new Date().getFullYear()) * 12 + jan1.getMonth() - new Date().getMonth());
    const projected = Number(goal.current_amount) + Number(goal.monthly_contribution) * monthsUntil;
    return `By January 1st you will have saved ${formatAmount(projected, currency)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Savings Goals</h1>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-primary text-primary-foreground hover:bg-gold-glow active:scale-95"
          size="sm"
        >
          <Plus size={16} className="mr-1" /> New Goal
        </Button>
      </div>

      {(!goals || goals.length === 0) ? (
        <div className="surface-card rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No savings goals yet. Create one to start tracking.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const pct = Number(goal.target_amount) > 0
              ? Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
              : 0;
            return (
              <div key={goal.id} className="surface-card rounded-lg p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{goal.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatAmount(Number(goal.current_amount), currency)} of {formatAmount(Number(goal.target_amount), currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-[2px] w-full bg-muted/20 overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-primary font-mono-finance mt-1">{pct.toFixed(1)}%</p>
                </div>

                {/* Projections */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{getProjection(goal)}</p>
                  <p className="text-xs text-muted-foreground">{getByDate(goal)}</p>
                </div>

                {/* Quick add */}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Add amount"
                    className="border-border bg-background text-foreground text-sm h-8"
                    id={`add-${goal.id}`}
                  />
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground h-8 text-xs hover:bg-gold-glow"
                    onClick={() => {
                      const input = document.getElementById(`add-${goal.id}`) as HTMLInputElement;
                      const val = parseFloat(input?.value || '0');
                      if (val > 0) {
                        updateGoal.mutate({
                          id: goal.id,
                          current_amount: Number(goal.current_amount) + val,
                        });
                        input.value = '';
                        toast.success('Amount added');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="surface-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Savings Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)}
              className="border-border bg-background text-foreground" required />
            <Input type="number" step="0.01" placeholder="Target amount" value={target}
              onChange={(e) => setTarget(e.target.value)} className="border-border bg-background text-foreground" required />
            <Input type="number" step="0.01" placeholder="Monthly contribution" value={monthly}
              onChange={(e) => setMonthly(e.target.value)} className="border-border bg-background text-foreground" required />
            <Button type="submit" disabled={addGoal.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-gold-glow active:scale-95">
              {addGoal.isPending ? 'Creating...' : 'Create Goal'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default GoalsPage;
