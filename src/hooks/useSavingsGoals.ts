import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSavingsGoals = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['savings_goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useAddSavingsGoal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (goal: {
      name: string;
      target_amount: number;
      monthly_contribution: number;
      current_amount?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('savings_goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings_goals'] }),
  });
};

export const useUpdateSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; current_amount?: number; name?: string; target_amount?: number; monthly_contribution?: number }) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings_goals'] }),
  });
};

export const useDeleteSavingsGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings_goals'] }),
  });
};
