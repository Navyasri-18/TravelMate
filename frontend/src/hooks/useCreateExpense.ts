import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExpense } from '@/api/expenses';
import { fetchExpenseById } from '@/api/expenses';
import { toast } from 'sonner';
import type { CreateExpenseInput, Expense } from '@/types/expense';

interface UseCreateExpenseInput {
  tripId: string;
}

export const useCreateExpense = ({ tripId }: UseCreateExpenseInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const expenseId = await createExpense(input);
      // Fetch full expense with joins so we can update cache properly
      const full = await fetchExpenseById(expenseId);
      return full;
    },
    
    onSuccess: (newExpense) => {
      if (!newExpense) return;
      
      // Prepend the new expense to the cache (newest first ordering)
      queryClient.setQueryData<Expense[]>(['expenses', tripId], (prev = []) => {
        // Dedup in case realtime already fired
        if (prev.some((e) => e.id === newExpense.id)) return prev;
        return [newExpense, ...prev];
      });
      
      toast.success('Expense added');
    },
    
    onError: (error: Error) => {
      const msg = error?.message || 'Failed to add expense';
      toast.error(msg);
    },
  });
};
