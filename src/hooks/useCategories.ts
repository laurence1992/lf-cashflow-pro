import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCategories = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, icon: icon || 'circle-dot', user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};
