import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExpense } from '@/api/expenses';
import { toast } from 'sonner';
import type { Expense } from '@/types/expense';

interface UseDeleteExpenseInput {
  tripId: string;
}

export const useDeleteExpense = ({ tripId }: UseDeleteExpenseInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expenseId: string) => {
      await deleteExpense(expenseId);
      return expenseId;
    },
    
    // Optimistic update: remove the expense from cache immediately
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', tripId] });
      
      const previous = queryClient.getQueryData<Expense[]>(['expenses', tripId]);
      
      queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
        return prev.filter((e) => e.id !== expenseId);
      });
      
      return { previous };
    },
    
    onError: (error: Error, _expenseId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['expenses', tripId], context.previous);
      }
      toast.error(error?.message || 'Failed to delete expense');
    },
    
    onSuccess: () => {
      toast.success('Expense deleted');
    },
  });
};
