import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Currency = 'EUR' | 'USD' | 'CNY';

export const currencySymbols: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  CNY: '¥',
};

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCurrencySymbol = () => {
  const { data: profile } = useProfile();
  const currency = (profile?.currency as Currency) || 'USD';
  return currencySymbols[currency];
};

export const formatAmount = (amount: number, currency: Currency = 'USD') => {
  return `${currencySymbols[currency]}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
