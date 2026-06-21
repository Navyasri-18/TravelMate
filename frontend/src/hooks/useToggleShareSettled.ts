import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleShareSettled } from '@/api/expenses';
import { toast } from 'sonner';
import type { Expense } from '@/types/expense';

interface UseToggleShareSettledInput {
  tripId: string;
}

interface ToggleVariables {
  shareId: string;
  expenseId: string;
  newSettled: boolean;
}

export const useToggleShareSettled = ({ tripId }: UseToggleShareSettledInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shareId, newSettled }: ToggleVariables) => {
      await toggleShareSettled(shareId, newSettled);
    },
    
    // Optimistic update
    onMutate: async ({ shareId, expenseId, newSettled }) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', tripId] });
      
      const previous = queryClient.getQueryData<Expense[]>(['expenses', tripId]);
      
      queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
        return prev.map((exp) => {
          if (exp.id !== expenseId) return exp;
          return {
            ...exp,
            shares: (exp.shares || []).map((s) =>
              s.id === shareId
                ? {
                    ...s,
                    settled: newSettled,
                    settled_at: newSettled ? new Date().toISOString() : null,
                  }
                : s
            ),
          };
        });
      });
      
      return { previous };
    },
    
    onError: (error: Error, _vars, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(['expenses', tripId], context.previous);
      }
      toast.error(error?.message || 'Failed to update share');
    },
    
    // No success toast — the visual change is immediate feedback enough
  });
};
