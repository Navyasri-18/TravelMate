import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateExpense, fetchExpenseById } from '@/api/expenses';
import { toast } from 'sonner';
import type { UpdateExpenseInput } from '@/api/expenses';
import type { Expense } from '@/types/expense';

interface UseUpdateExpenseInput {
  tripId: string;
}

export const useUpdateExpense = ({ tripId }: UseUpdateExpenseInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateExpenseInput) => {
      await updateExpense(input);
      // Refetch the full expense with joined data
      const refreshed = await fetchExpenseById(input.expenseId);
      return refreshed;
    },
    
    onSuccess: (refreshed) => {
      if (!refreshed) return;
      
      queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
        return prev.map((e) => (e.id === refreshed.id ? refreshed : e));
      });
      
      toast.success('Expense updated');
    },
    
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to update expense');
    },
  });
};
