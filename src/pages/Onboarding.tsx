import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Currency, currencySymbols } from '@/hooks/useProfile';

const currencies: { code: Currency; name: string }[] = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
];

const Onboarding = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ currency: selected, onboarded: true })
        .eq('user_id', user.id);
      if (error) throw error;
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-primary">LF</h1>
          <p className="mt-2 text-sm text-muted-foreground">Select your default currency</p>
        </div>

        <div className="space-y-3">
          {currencies.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c.code)}
              className={`w-full rounded-lg p-4 text-left transition-all ${
                selected === c.code
                  ? 'gold-glow bg-card'
                  : 'surface-card hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.code}</p>
                </div>
                <span className="text-2xl font-mono-finance text-primary">
                  {currencySymbols[c.code]}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="mt-6 w-full bg-primary text-primary-foreground font-bold hover:bg-gold-glow active:scale-95 transition-all"
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
};

export default Onboarding;
