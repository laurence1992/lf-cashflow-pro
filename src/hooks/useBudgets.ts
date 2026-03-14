import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBudgets = (month?: number, year?: number) => {
  const { user } = useAuth();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  return useQuery({
    queryKey: ['budgets', user?.id, m, y],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categories(name, icon)')
        .eq('month', m)
        .eq('year', y);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useUpsertBudget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (budget: {
      category_id: string;
      amount: number;
      month: number;
      year: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ ...budget, user_id: user.id }, { onConflict: 'user_id,category_id,month,year' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });
};
